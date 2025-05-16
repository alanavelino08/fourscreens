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
docker build -t api-fourscreens:v$(date +%Y%m%d%H%M) .

# github
docker build -t ghcr.io/alanavelino08/api-fourscreens:v$(date +%Y%m%d%H%M) .
```

Check the docker images with the next command:

``` bash
docker images
```

Run to push the docker image to GitHub Container Registry with the next command:

``` bash 
docker push ghcr.io/alanavelino08/api-fourscreens
```

Run the docker image

``` bash
docker run -d --name api-fourscreens --network server-network -p 8000:8000 api-fourscreens
```