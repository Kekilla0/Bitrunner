/* CONSTANTS */
const file_contents = `
  var target = getHostname();
  var moneyThresh = getServerMaxMoney(target) * 0.75;
  var securityThresh = getServerMinSecurityLevel(target) + 5;

  while(true) {
    if (getServerSecurityLevel(target) > securityThresh) {
        // If the server's security level is above our threshold, weaken it
        weaken(target);
    } else if (getServerMoneyAvailable(target) < moneyThresh) {
        // If the server's money is less than our threshold, grow it
        grow(target);
    } else {
        // Otherwise, hack it
        hack(target);
    }
}`;
const file_name = "template.script";

/* GLOBAL VARIABLES */
let actions = [];
let time = 0;

export async function main(ns) {
  ns.disableLog('ALL');
  ns.tail();

  //create file if needed
  if(!ns.fileExists(file_name)) await ns.write(file_name, file_contents, `w`);

  addAction(ns,"Script Start");

  while (true) {
    await hacknetManager(ns);
    await ns.sleep(1000);
  }
}

async function hacknetManager(ns){
  const player = {
    hack : {
      level : function() { return ns.getHackingLevel(); },
    },
    exes : ["brutessh","ftpcrack","relaysmtp","sqlinject","httpworm"].filter(e => ns.fileExists(`${e}.exe`)),
  };
  
  //scan servers
  let servers = ["n00dles", "foodnstuff", "sigma-cosmetics", "joesguns", "hong-fang-tea", "harakiri-sushi", "iron-gym"]
    .filter(s => ns.serverExists(s))                                          //does the server exist?
    .filter(s => player.hack.level() >= ns.getServerRequiredHackingLevel(s))  //are they of my level
    .filter(s => player.exes.length >= ns.getServerNumPortsRequired(s))       //can i hack them?

  //hack servers
  for(let server of servers){
    if(ns.isRunning(file_name, server)) continue;

    //if server isn't hacked already - hack it
    if(!ns.hasRootAccess(server)){
      for(let exe of player.exes)
        ns[exe](server);

      ns.nuke(server);
      addAction(ns, `${server} hacked.`);
    }

    //if the file doesn't exists on the server - copy it
    await ns.scp(file_name, 'home', server);
    addAction(ns, `${file_name} copied to ${server}`);

    //execute file at max threads
    let script_ram = ns.getScriptRam(file_name, 'home');
    let server_ram = ns.getServerMaxRam(server);
    let threads = Math.floor(server_ram / script_ram);

    ns.exec(file_name, server, threads);
    addAction(ns, `${file_name} executing on ${server} with ${threads} threads`);
  }

  if(time == 0) console.log("DATA | ", {file_contents, file_name, ns, player, servers });
  time++;

  display(ns, player, servers);
}

function addAction(ns, text, display = false) {
  actions.push({
    time,
    text
  });
  if (display) ns.tprint(text);
}

function display(ns, player, servers){
  ns.clearLog();
  ns.print(`╔════════════╦════════════════════════════════╗`);
  ns.print(`║ Hacking    ║${formatString("Hacking Level : " + player.hack.level(), 32)}║`);
  ns.print(`╠════════════╬══════════╦═════════╦═══════════╣`);
  ns.print(servers.reduce((a,b,i,r) => a += `║${formatString(b, 12)}║${formatNumber(ns.getServerMoneyAvailable(b)/ns.getServerMaxMoney(b) * 100, 10, '%')}║${formatNumber(ns.getServerSecurityLevel(b)/ns.getServerMinSecurityLevel(b) * 100, 9, '%')}║${formatNumber(ns.getScriptIncome(file_name, b), 11, '/sec')}║${i == r.length - 1 ? '' : '\n'}`, ``));
  ns.print(`╠════════════╩══════════╩═════════╩═══════════╣`);
  ns.print(`║ Actions                                     ║`);
  ns.print(actions.reduce((a,b,i,r) => a += `║${formatString(b.text, 45)}║${i == r.length - 1 ? '' : '\n'}`, ``));
  ns.print(`╚═════════════════════════════════════════════╝`);

  if(actions.length > 10) actions = actions.filter(a => a.time + 30 > time);

  function formatNumber(num, length, suffix, padding = ' '){
    return formatString(ns.nFormat(num, '0.00a'), length - suffix.length, padding) + suffix;
  }

  function formatString(str, length, padding = ' ') {
    str = str.toString();
    if (str.length > length)
      return str.substring(0, length - 3) + "...";
    else
      return str.padStart(length, padding);
  }
}

/* 4.90 */