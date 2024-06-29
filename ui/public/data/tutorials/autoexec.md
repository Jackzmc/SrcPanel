# Autoexec

autoexec.cfg is a file that automatically runs commands when you startup your game. It can also create shortcut aliases to other commands.

The `autoexec.cfg` file is to be created in the `Left 4 Dead 2/cfg` directory.

## Creating the autoexec.cfg file

1. In your steam window for Left 4 Dead 2, open the propeties
   * click the gear icon or rightclick -> properties
2. Click on the left sidebar the **Installed Files** tab then the **Browse** button on the right
 
This should open your file explorer

3. Browse to **left4dead2** -> **cfg**
4. Right click -> New -> Text Document
5. Rename to `autoexec.cfg`, make sure it's a **.cfg** and not **.txt**

[Click here for video](https://i.jackz.me/2023/12/BelatedZenfk.mp4)

## Example config

This config has these aliases:
* `mm_main` or `mmm` - sets to the main server
* `mm_reserved` or `mmr` - sets to reserved #1 (pea server)
* `mm_reserved2` - sets to reserved #2
* `mm_randomizer` - sets to randomizer server
* `mm_clear` and `mmc` - clears forced server, allowing official server play

At the bottom, it is set to then run `mm_main`, setting your default server to the main 5+ server. Change this if you want to mm_reserved

```
alias "mm_main" "mm_dedicated_force_servers 74.91.114.239; echo Lobby set to Main"
alias "mmm" "mm_main"
alias "mm_reserved" "mm_dedicated_force_servers 74.91.114.239:27101; echo Lobby set to Reserved"
alias "mm_reserved2" "mm_dedicated_force_servers 74.91.114.239:27102; echo Lobby set to Reserved2"
alias "mm_randomizer" "mm_dedicated_force_servers 74.91.114.239:27016; echo Lobby set to Randomizer"
alias "mmr" mm_reserved
alias "mmra" mm_randomizer
alias mm_clear mm_dedicated_force_servers ""
alias mmc mm_clear
# Set to 5+ server:
mm_main
```

If you copy this to your autoexec.cfg, you can then run those commands above and when you launch a lobby (as the host), it will automatically be set to whatever server you want.