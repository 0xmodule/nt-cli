# docker stop nocturne-$1
# docker rm nocturne-$1
# docker build . -t nocturne--test2
[ ! "$(docker ps -a | grep nocturne-$1)" ] && echo "run docker" && docker run --restart=always --name  nocturne-$1 --entrypoint=/bin/bash -d nocturne -c './script.sh '$6
[ ! "$(docker ps | grep nocturne-$1)" ] && echo "start docker" && docker restart nocturne-$1

# sleep 2
docker container cp ./script.sh nocturne-$1:./script.sh
docker container cp ./proxychains4.conf nocturne-$1:/etc/proxychains4.conf
docker exec nocturne-$1 /bin/bash -c  "echo 'socks5 $2 $3 $4 $5' >> /etc/proxychains4.conf"
# docker exec nocturne-$1 /bin/bash -c  "cat /etc/proxychains4.conf"
docker cp dist/index.js nocturne-$1:/usr/local/lib/node_modules/@nocturne-xyz/nocturne-setup/dist
# docker container cp ./nocturne-$1.json nocturne-$1:/root/.nocturne-
# sleep 2

docker restart nocturne-$1
# docker logs nocturne-$1 -f