# Server Actions

```yaml
# The ID of the action
start_server:
  name: Start # Optional. Display name
  command: builtin:start # The command to run
  color: hsl(80, 50%, 50%) # Optional. Color of buttons, text
  showWhen: offline # Optional. Default is 'always', choices: 'always', 'online', 'offline'
  inQuickAction: true # Optional. Should show in quick action list in manage servers
  isHidden: true # Optional. Requires user to hold shift to see option in manage server view
  requires: # Optional. List of features that are required for action to show
    - docker

restart:
  name: Request Restart
  command: builtin:request_stop
  description: Will restart server if there are no players online
  requires:
    - performCommands
  inQuickAction: true

unreserve:
  name: Unreserve
  command: builtin:unreserve
  description: Removes lobby reservation, allowing 5+ users to join. (Automatically
    removed once 4 players join)
  requires:
    - performCommands
  inQuickAction: true


restart_force: 
  name: Force Restart
  command: builtin:stop
  isHidden: true
  description: Forcefully restarts server, even if players are online
  color: hsl(348, 86%, 61%)

docker_delete:
  name: Delete
  command: builtin:delete
  isHidden: true
  description: Deletes the server instance
  color: hsl(348, 86%, 61%)
  showWhen: any
  requires:
    - docker
```