FROM node:18
RUN apt-get update
RUN apt-get install proxychains-ng -y
RUN npm install -g @nocturne-xyz/nocturne-setup

COPY dist/index.js /usr/local/lib/node_modules/@nocturne-xyz/nocturne-setup/dist
COPY script.sh .
# COPY proxychains4.conf /etc/proxychains4.conf

RUN chmod +x *.sh

# ENTRYPOINT ["/bin/bash","-c", "./script.sh"]
# CMD ["./script.sh"]
ENTRYPOINT []
CMD []