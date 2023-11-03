#!/bin/bash

# Stop and remove the Docker container if it exists
# docker stop nocturne-$1
# docker rm nocturne-$1

# Check if the Docker container exists and run it if not
if [ ! "$(docker ps -a | grep nocturne-$1)" ]; then
    echo "Running Docker container"
    docker run --restart=always -v "$PWD/data/nocturne-$1":/app  --name nocturne-$1 --entrypoint=/bin/bash -d nocturne -c "./script.sh $6"
fi

# Check if the Docker container is not running and restart it
if [ ! "$(docker ps | grep nocturne-$1)" ]; then
    echo "Starting Docker container"
    docker restart nocturne-$1
fi

random=$(uuidgen)
cp proxychains4.conf "tmp/proxychains-$random.conf"
echo "socks5 $2 $3 $4 $5" >> "tmp/proxychains-$random.conf"

# Copy necessary files to the container
docker container cp ./script.sh nocturne-$1:/app/script.sh
docker container cp "tmp/proxychains-$random.conf" nocturne-$1:/etc/proxychains4.conf

rm "tmp/proxychains-$random.conf"

# Copy index.js to the container
docker cp dist/index.js nocturne-$1:/usr/local/lib/node_modules/@nocturne-xyz/nocturne-setup/dist

# Restart the Docker container
docker restart nocturne-$1

# View container logs
# docker logs nocturne-$1 -f
