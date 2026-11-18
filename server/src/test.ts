import SteamID from "steamid";

console.log(SteamID.fromIndividualAccountID(46047027), SteamID.fromIndividualAccountID(46047027).getSteam2RenderedID(), "STEAM_0:1:46047027")
console.log(new SteamID('46047027'))
console.log(new SteamID('STEAM_0:1:46047027'))
console.log(new SteamID('STEAM_0:1:46047027').getSteam2RenderedID())
