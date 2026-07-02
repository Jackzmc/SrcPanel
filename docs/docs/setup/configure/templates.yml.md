# Templates

```yaml
my_template_id: # ID for template
  image: debian:12 # the docker image to use
  bindIp: 127.0.0.1 # the IP to bind to
  ports:
    # The port number to start with, each instance will add one to start
    start: 27015 

    # Optional, sets the last available port. Creation will fail if all ports occupied
    #end: 27018  
  # List of volumes to expose to container
  volumes:
    - "/srv/l4d2/main/addons:/server/addons"
  command: bash
  # Template, similar to server_groups list server
  serverTemplate: 
    # The hostname to use for server
    host: test.localhost
    # Name of server in panel
    name: test[#%id%] - %port%
    # The gamedig game
    type: l4d2
    # Legacy.
    cfgDir: "/dir/to/cfg/folder"
  #cpuShares:  # Optional, the cpu share ratio
  #memLimit: 1024 # Optional, max memory in megabytes (SI) 
```