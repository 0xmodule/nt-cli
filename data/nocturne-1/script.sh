#!/bin/bash

# Check if the correct number of parameters is provided
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <github_token>"
    exit 1
fi

# Set the GitHub token as an environment variable
export github_token="$1"

# Run the desired command with proxychains
# ls -la output
proxychains -f /etc/proxychains4.conf nocturne-setup contribute -a $github_token -c nocturne-v1
