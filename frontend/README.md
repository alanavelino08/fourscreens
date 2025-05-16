# Docker Configuration & Deployment

Create a docker network to connect containers with the next command:

``` bash
docker network create --driver bridge server-network
```

Create a docker volume to persist data with the next command:

``` bash
docker volume create --name storage-fourscreens
```

Run to build and create docker image with the next command:

``` bash
# local
docker build -t web-fourscreens:v$(date +%Y%m%d%H%M) .

# github
docker build -t ghcr.io/alanavelino08/web-fourscreens:v$(date +%Y%m%d%H%M) .
```

Check the docker images with the next command:

``` bash
docker images
```

Run to push the docker image to GitHub Container Registry with the next command:

``` bash 
export VERSION=v202505152211
docker push ghcr.io/alanavelino08/web-fourscreens:v202505152211
```

Run the docker image

``` bash
docker run -d --name web-fourscreens --network server-network -p 80:80 web-fourscreens:v
```
