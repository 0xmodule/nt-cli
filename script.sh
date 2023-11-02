echo 'start '$1
proxychains -f /etc/proxychains4.conf nocturne-setup contribute -a $1 -c nocturne-v1
# nocturne-setup contribute -a $1 -c nocturne-v1