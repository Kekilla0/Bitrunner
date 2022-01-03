/* CONSTANTS */
const percent = 0.05;

/* GLOBAL VARIABLES */
let actions = [];
let time = 0;

export async function main(ns) {
  ns.disableLog('ALL');
  ns.tail();

  while (true) {
    await hacknetManager(ns);
    await ns.sleep(1000);
  }
}

async function hacknetManager(ns){
  const money = getPlayerInfo("money");
  const info = getHackNetInfo(); 
  const prices = [
    { cmd : "nextNode", p : info.next, },
    ...info.nodes.map(node => ({ cmd : `nextLevel.${node.i}`, p : node.level })),
    ...info.nodes.map(node => ({ cmd : `nextRam.${node.i}`, p : node.ram })),
    ...info.nodes.map(node => ({ cmd : `nextCore.${node.i}`, p : node.core })),
  ].sort((a,b) => a.p - b.p);

  const [ cmd , target ] = prices[0].cmd.split('.');
  const price = prices[0].p;

  if(price <= money * percent){
    if(cmd == "nextNode"){
      let t = ns.hacknet.purchaseNode();
      if(t > 0) addAction(`Purchased Node : hacknet-node-${target}`, true);
    }

    if(cmd == "nextLevel"){
      let t = ns.hacknet.upgradeLevel(target,1);
      if(t) addAction(`Purchased Level : hacknet-node-${target}`);
    }

    if(cmd == "nextRam"){
      let t = ns.hacknet.upgradeRam(target,1);
      if(t) addAction(`Purchased Ram : hacknet-node-${target}`);
    }

    if(cmd == "nextCore"){
      let t = ns.hacknet.upgradeCore(target,1);
      if(t) addAction(`Purchased Core : hacknet-node-${target}`);
    }
  }
  
  display();
  time++;
  if(actions.length > 10) actions = actions.filter(a => a.time + 30 > time);

  function getPlayerInfo(info = ""){ return ns.getPlayer()[info]; }
  function getHackNetInfo(){
    const maxNodes = 30;
    const numNodes = ns.hacknet.numNodes();
    const next = ns.hacknet.getPurchaseNodeCost();
    const nodes = Array(numNodes)
      .fill(0)
      .map((e,i) => ({
        stats : ns.hacknet.getNodeStats(i),
        ram : ns.hacknet.getRamUpgradeCost(i,1),
        level : ns.hacknet.getLevelUpgradeCost(i,1),
        core : ns.hacknet.getCoreUpgradeCost(i,1),
        i,
      }));

    return { nodes, maxNodes, numNodes, next, };
  }
  function addAction(text, display = false) {
    actions.push({
      time,
      text
    });
    if (display) ns.tprint(text);
  }
  function getProduction(arr){
    return ns.nFormat(arr.reduce((a,b) => a += b.stats.production, 0), '0.00a') + "/sec";
  }
  function display(){
    ns.clearLog();
    ns.print(`╔═══════════╦════════════════════════════════╗`);
    ns.print(`║ Hacknet   ║${formatString(getProduction(info.nodes) + ``, 32)}║`);
    ns.print(`╠═════╦═════╬══════╦════╦════════════════════╣`);
    ns.print(`║   N ║   L ║    R ║  C ║         Production ║`);
    ns.print(`${info.nodes.reduce((a,b,i,r) => a += `║${formatString(i,5)}║${formatString(b.stats.level,5)}║${formatString(b.stats.ram + "gb",6)}║${formatString(b.stats.cores,4)}║${formatString(getProduction([b]), 20)}║${i == r.length - 1 ? '' : '\n'}`, ``)}`);
    ns.print(`╠═════╩═════╬══════╩════╩════════════════════╣`);
    ns.print(`║ Action                                     ║`);
    ns.print(`${actions.reduce((a,b,i,r) => a += `║${formatString(b.text, 44)}║${i == r.length - 1 ? '' : '\n'}`, ``)}`);
    ns.print(`╚════════════════════════════════════════════╝`);

    function formatString(str, length, padding = ' ') {
      str = str.toString();
      if (str.length > length)
        return str.substring(0, length - 2) + "...";
      else
        return str.padStart(length, padding);
    }
  }
}