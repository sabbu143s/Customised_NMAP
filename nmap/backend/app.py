import os
import nmap
import json
import uuid
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Define the path for our history file
HISTORY_FILE = 'scan_history.json'

def read_history():
    """Reads the scan history from the JSON file."""
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []

def write_history(history_data):
    """Writes the updated history back to the JSON file."""
    try:
        with open(HISTORY_FILE, 'w') as f:
            json.dump(history_data, f, indent=4)
    except IOError as e:
        print(f"Error writing to history file: {e}")

@app.route('/scan', methods=['POST'])
def scan():
    """
    This endpoint now ONLY runs the scan and returns the result.
    It does NOT write to the history file itself.
    """
    try:
        data = request.get_json()
        target = data.get('target')
        options = data.get('options', '-sV')

        if not target:
            return jsonify({"error": "Target is required"}), 400

        nm = nmap.PortScanner()
        nm.scan(hosts=target, arguments=options)

        scan_results = []
        for host in nm.all_hosts():
            host_info = {
                "host": host,
                "hostname": nm[host].hostname(),
                "state": nm[host].state(),
                "protocols": []
            }
            for proto in nm[host].all_protocols():
                proto_info = {"protocol": proto, "ports": []}
                for port in sorted(nm[host][proto].keys()):
                    port_details = nm[host][proto][port]
                    # Ensure the port number is part of the details
                    port_details['port'] = port 
                    proto_info["ports"].append(port_details)
                host_info["protocols"].append(proto_info)
            scan_results.append(host_info)
        
        return jsonify(scan_results)

    except nmap.PortScannerError as e:
        return jsonify({"error": f"Nmap error: {e}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/history', methods=['GET'])
def get_history():
    """Retrieves the entire scan history."""
    history = read_history()
    return jsonify(history)

@app.route('/history', methods=['POST'])
def add_to_history():
    """
    New endpoint to add a completed scan to the history file.
    This is called by the frontend just before a new scan starts.
    """
    try:
        data = request.get_json()
        if not all(k in data for k in ['target', 'options', 'results']):
            return jsonify({"error": "Missing data for history entry"}), 400

        history = read_history()
        history_entry = {
            "id": str(uuid.uuid4()),
            "target": data['target'],
            "options": data['options'],
            "timestamp": datetime.now().isoformat(),
            "results": data['results']
        }
        history.insert(0, history_entry)
        write_history(history)
        return jsonify({"success": True, "message": "History saved."}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
