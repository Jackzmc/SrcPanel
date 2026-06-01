# JzPanel

Game server administrator and manager for primarily source engine games. Includes online viewing and management of in-game notes, bans, server management, player management, server documentation, and admin discussions. Automatically start new instances of servers, view live information about games, view activity logs, download new workshop addons or manage files.

This tool has been developed over many years for my own server and has served me quite well. It's feature packed and comes with its own plugins for bans, notes, and live server data. 

A demo site is avaialble at https://demo.example.com

## Parts

This project contains 3 separate parts:

* Web Server (Fastify server)
* UI Server (nuxt) - handles serving SSR and CMS functionality
* Sourcemod Plugins - adds functionality to panel 
    * Required
        * `adminpanel.smx` - live socket, handles commands from panel, sending live data
        * `admin-sql-threaded.smx` - for sourcemod admins
        * `activitymonitor.smx` - record in-game actions/messages
    * Optional
        * `globalbans.smx` - records bans to DB for use across multiple servers
        * `sm_player_notes.smx`
        * `l4d2-stats-plugin.smx` - [l4d2-stats](https://git.jackz.me/l4d2-stats) plugin for extended information about players and links to their pages


The server and its plugins only supports MariaDB, Postgres is unfortunately not supported at this time. 

## Supporting

If you want to show your support, I would appreciate it. 

You can support me on [Github Sponsors](https://github.com/sponsors/Jackzmc) or [Ko-fi](https://ko-fi.com/jackzmc).

## License

Everything in repo except for `sourcemod` folder, is licensed under the [GNU Affero General Public License v3.0](https://choosealicense.com/licenses/agpl-3.0/). 

## Contributing

Contributions are welcome and appreciated. AI use itself is okay if the code is well reviewed, but "vibe-coded" (under my determinations) development is not welcome. 

It is recommend to first open an issue before creating any large PR to discuss it first.

## AI Use Disclaimer

The only use of AI in this project is for consulting ways over blockers, ways to fix bugs, and as a rubber duck. AI was used intially for the Nuxt UI rewrite for templating, getting started and learning Nuxt. AI has not ever been used on the server or plugin side.