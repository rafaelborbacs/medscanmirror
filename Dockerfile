FROM ubuntu

ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /home

RUN apt-get update && apt-get install -y --no-install-recommends \
	sudo\
    git\
    curl\
    screen\
    wget\
    apt-transport-https\
    ca-certificates\
    lsb-release\
    && \
apt-get clean

#node + npm
RUN curl -sL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

RUN mkdir ./medscanmirror
COPY ./* ./medscanmirror/
WORKDIR /home/medscanmirror
RUN npm install
RUN npm install -g pm2

RUN chmod +x ./entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]
