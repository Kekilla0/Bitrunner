/* CONSTANTS */
const file = {
  contents : `var target = args[0];var moneyThresh = getServerMaxMoney(target) * 0.75;var securityThresh = getServerMinSecurityLevel(target) + 5;var iterations = 20;var i = 1;while(i != iterations) { if (getServerSecurityLevel(target) > securityThresh) { weaken(target); } else if (getServerMoneyAvailable(target) < moneyThresh) { grow(target); } else { hack(target); } i++; }`,
  name : "template.script",
  cost : 2.40,
  // name : function(){ return Math.random().toString(36).slice(2); }
};

/* GLOBAL VARIABLES */
let actions = [];
let time = 0;
let money = 0;

export async function main(ns) {
  actions = [], time = 0, money = 0;

  ns.disableLog('ALL');
  ns.tail();

  //create file if needed
  if(!ns.fileExists(file.name)) await ns.write(file.name, file.contents, `w`);

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
  
  //scan all servers, sort them by # of threads available
  let servers = getServers(ns, player)
    .map(s => ({...s, profit : s.profit(), threads : s.threads() })) //build profit and threads
    .filter(s => player.hack.level() >= s.requiredHackingSkill)      //are they of my level
    .filter(s => player.exes.length >= s.numOpenPortsRequired)       //can i hack them?
    .sort((a,b) => b.threads - a.threads);                           //sort servers by "threads"

  //get all host machines --- high profit machines
  let hosts = [...servers]
    .filter(s => s.profit !== 0)
    .sort((a,b) => b.profit - a.profit)
    .slice(0,10);

  if(time === 0) console.log({ player, servers, hosts, file });

  //gain root access and copy file if needed
  for(let server of servers){
    if(ns.isRunning(file.name, server.hostname)) continue;

    //if server isn't hacked already - hack it
    if(!ns.hasRootAccess(server.hostname)){
      for(let exe of player.exes)
        ns[exe](server.hostname);

      ns.nuke(server.hostname);
      addAction(ns, `${server.hostname} hacked.`);
    }
    await ns.scp(file.name, 'home', server.hostname);
  }

  //control what executes the script on what server
  let index = 0, temp = [...servers];
  while(temp.length > 0){
    let t = temp.shift();
    if(t.threads === 0) continue;

    //find server index, remove variables of 10 until value is 0-9, execute on host[index].hostname
    let host = hosts[index];
    index = index === 9 ? 0 : index + 1;

    await ns.exec(file.name, t.hostname, t.threads, host.hostname);
  }

  if(time == 0) console.log("DATA | ", { file , ns, player, servers });
  time++;

  display(ns, player, hosts, servers);
}

function addAction(ns, text, display = false) {
  actions.push({
    time,
    text
  });
  if (display) ns.tprint(text);
}

/* Status (using maths), Sort by Profit, Only show top 10, Display Exe count, Ram Available/Ram Used, Display Thread Count, Display Time Up, Display $/sec, hacking level, & exp/sec */
function display(ns, player, hosts, servers){
  if(time === 1) console.log({ gdr : gd("rate"), gdt : gd("total") });

  ns.clearLog();
  ns.print(`╔════════════╦═══════════════════════════════════════╗`);
  ns.print(`║ Hacking    ║                                       ║`);
  ns.print(`╠════════════╬══════════════════╦════════════════════╣`);
  ns.print(`║============║     TOTAL        ║        RATE        ║`);
  ns.print(`║      Money ║${fn(gd("total")?.money, 18)}║${fn(gd("rate")?.money, 20, '/sec')}║`);
  ns.print(`║ Experience ║${fn(gd("total")?.exp, 18)}║${fn(gd("rate")?.exp, 20, '/sec')}║`);
  ns.print(`╠═══╦════════╩════════╦════════╦╩═══════╦════════════╣`);
  ns.print(`║   ║            Name ║   H%   ║   M%   ║      $/sec ║`);
  ns.print(hosts.reduce((a,b,i,r) => a += `║ ${i} ║${fs(b.hostname, 17)}║${fn(b.hackDifficulty/b.minDifficulty * 100, 8, '%')}║${fn(b.moneyAvailable/b.moneyMax * 100, 8, '%')}║${fn(gdh("rate", b).money, 12, '/sec')}║${i == r.length - 1 ? '' : '\n'}`, ``));
  ns.print(`╠═══╩══════╦══════════╩══════╦═╩════════╩════════════╣`);
  ns.print(`║ Exes : ${player.exes.length} ║ Threads : ${fn(servers.reduce((a,b) => a+=b.threads, 0), 6)}║ ${fs(ns.tFormat(time), 22)}║`);
  ns.print(`╠══════════╩═════════════════╩═══════════════════════╣`)
  ns.print(`║ Actions                                            ║`);
  ns.print(actions.reduce((a,b,i,r) => a += `║${fs(b.text, 52)}║${i == r.length - 1 ? '' : '\n'}`, ``));
  ns.print(`╚════════════════════════════════════════════════════╝`);

  if(actions.length > 10) actions.shift();

  function fn(num, length, suffix, padding = ' '){
    return fs(ns.nFormat(num, '0.00a'), length - (suffix?.length ?? 0), padding) + (suffix ?? "");
  }

  function fs(str, length, padding = ' ') {
    str = str.toString();
    if (str.length > length)
      return str.substring(0, length - 3) + "...";
    else
      return str.padStart(length, padding);
  }

  function gd(t){
    return hosts.reduce((a,b,i,r) => {
      let {money, exp} = gdh(t, b);
      if(isNaN(money) || isNaN(exp)) return a;
      return { money : a.money + money, exp : a.exp + exp };
    }, { money : 0, exp : 0 });
  }

  function gdh(t, h){
    let scriptData = servers
      .map(s => ns.getRunningScript(file.name, s.hostname, h.hostname))
      .filter(d => d?.onlineExpGained && d?.onlineMoneyMade && d?.onlineRunningTime)
      .map(s => ({ money : s.onlineMoneyMade, exp : s.onlineExpGained, time : s.onlineRunningTime }));

    if(time === 10) console.log({ t, h, servers, scriptData });

    switch(t){
      case "rate" :
        return scriptData.reduce((a,b,i,r) => ({money : a.money + (b.money/b.time), exp : a.exp + (b.exp/b.time) }),{ money : 0, exp : 0});
      case "total":
        return scriptData.reduce((a,b,i,r) => ({money : a.money + (b.money), exp : a.exp + (b.exp) }),{ money : 0, exp : 0});
    }
  }
}

function getServers(ns) {
  let svObj = (name = 'home', depth = 0) => ({ 
    ...ns.getServer(name),  
    profit : function(){ return ((this.moneyMax * this.serverGrowth) / (2.5 * this.requiredHackingSkill * this.minDifficulty + 500) / (1e7)) },
    threads : function(){ return Math.max(0, Math.floor((this.maxRam - this.ramUsed)/file.cost)); },
});
  let result = [];
  let visited = { 'home': 0 };
  let queue = Object.keys(visited);
  let name;
  while ((name = queue.pop())) {
      let depth = visited[name];
      result.push(svObj(name, depth));
      let scanRes = ns.scan(name);
      for (let i = scanRes.length; i >= 0; i--) {
          if (visited[scanRes[i]] === undefined) {
              queue.push(scanRes[i]);
              visited[scanRes[i]] = depth + 1;
          }
      }
  }
  return result;
}

/* 6.45 */

/* New Ideas

  Add possible "randomized" script naming convention, attack with 1 script at time at 1 thread each.

  Add possible "kill host" script that will reduce servers money to 0 when its not in the top ten servers.
*/