# Server Groups

Contains server groups and their servers. There are two different types of groups

## Static List

Hardcoded list of servers to check status for

```yaml
my-list-group:
  name: My List Group Name
  # Gamedig game, https://github.com/gamedig/node-gamedig/blob/master/GAMES_LIST.md
  game: l4d2
  # List of actions to use for _all_ servers in group, combined with individual lists
  actions: 
    - action1
  servers:
    # ID of server
    my-server-1:
      name: My Server 1 # Optional. Display name
      # Required, the IP and port. This will be displayed to end users, but if an different IP should be used internally, see internal
      public:
        host: myserverip.ordomain.com
        port: 27015
      # Optional, if not set, host and port inherit from 'public'.
      # These values will be used for all internal uses (status, rcon, etc), public will only be displayed.
      internal:
        host: localhost
        port: 270111
      hostname: 
        public: myserver.example.com # The public IP or domain, shown to end users.
        internal: localhost # Optional. For server statuses or any other internal connections an IP or domain to use. Defaults to public
      port: 27015 # Port to use
      # Enable rcon support
      rcon:
        # Optional. The IP by default is hostname.internal, but can be overwritten here
        ip: 127.0.0.1
        # Optional. The port by default is the server's port
        port: 27015
        # Required one of these entries 
        password: my_plaintext_password
        password_env: RCON_KEY # Instead of plaintext password, the password will be grabbed from env variable with this value
      # Optional. Any tags to show, they are only for display
      tags:
        - main
      # Optional. An activity ID for this server to show in server view
      activityId: "server-1"
      # Optional. Directory where server configs are
      cfgDirectory: "/data/server/server-1/cfgs"
      # Optional. Path to server log file
      logsPath: "/data/server/server-1/console.txt"
      # Optional. Any server specific actions that will be concated with group's actions
      actions:
        - action2
```

## Docker

Dynamic management of servers, where admins can start/stop instances, and can automatically create new instances when all servers full.

Requires the template referenced in the [templates.yml](./templates.yml/) file

```yaml
my-dynamic-group:
  name: My Docker Group # Optional. Display name of group
  # Gamedig game, https://github.com/gamedig/node-gamedig/blob/master/GAMES_LIST.md
  game: l4d2 # Optional. The game this group is for, must match gamedig type
  actions: # Optional. List of action ids to show for this group's servers, these are combined with server's actions
    - action1
    - action2
  # Define this as a dynamic server
  docker:
    template: test # The template id from templates.yml file
    min: 1 # Optional. The minimum amount of servers that should be running. Panel will automatically start servers to hit this target if set
    max: 5 # Optional. The maximum amount of servers that should be running. Panel will automatically stop servers to hit this target if set

```