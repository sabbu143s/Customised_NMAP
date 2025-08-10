#!/usr/bin/env bash
# exit on error
set -o errexit

# 1. Install Nmap on the server
apt-get update
apt-get install -y nmap

# 2. Install your Python packages
pip install -r requirements.txt