# Shares

Shares allow admins to manage files on disk, such as sourcemod plugins, or addons for a game

```yaml
my-addons:
  name: Addons
  description: Manage addons for L4D2
  sourceFolder: "/srv/games/l4d2/addons"
  # Optional. List of file extenstions to allow (for use in direct upload)
  validExts:
    - vpk
  # Optional. Steam app id
  appid: 550
  downloadSources:
    # Can admins download addons from steamworkshop? Uses appid
    steam_workshop: true
    # Allow admins to directly upload files
    upload: true
  # Desitnations are locations that files are deployed to
  destinations:
    my-dest-1:
      # Server Ids to restart, should be in group-id/server-id format
      restartTargets: 
        - minecraft
        - l4d2/main
      # List of file paths to symlink from source folder to
      paths:
        - "/home/steam/l4d2/main/addons/"

plugins:
  name: Plugins
  description: Ma/srv/games/l4d2/sourcemod/plugins"
  validExts:
    - smx
    - sp
  downloadSources: 
    steam_workshop: false
    upload: false
  destinations: {}
```