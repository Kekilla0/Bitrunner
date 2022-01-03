/** @param {NS} ns **/
let actions = [];
let time = 0;
let priority_variables = [10, 20, 80, 12];

export async function main(ns) {
  actions = []; time = 0;
  ns.disableLog('ALL');
  ns.tail();

  while (true) {
    await gangManger(ns, ns.args[0]);
    await ns.sleep(1000);
  }
}

async function gangManger(ns, p) {
  let player = ns.getPlayer();
  let faction = {};
  let gang = ns.gang.inGang();
  let members = [];
  let tasks = ns.gang.getTaskNames().map(n => ns.gang.getTaskStats(n));
  let equipment = ns.gang.getEquipmentNames().map(n => ({
    name: n,
    cost: ns.gang.getEquipmentCost(n),
    ...ns.gang.getEquipmentStats(n),
  }));
  let priority = "";

  for (let faction of player.factions)
    if (!gang)
      gang = ns.gang.createGang(faction);

  if (gang) {
    gang = ns.gang.getGangInformation();
    //check or get faction here

    if (ns.gang.canRecruitMember()) {
      let n = ns.gang.getMemberNames().length;
      let t = ns.gang.recruitMember(`gm${n}`);
      if (t) addAction(`Recruited (gm${n})`, true);
    }

    members = ns.gang.getMemberNames()
      .map(n => ({
        ...ns.gang.getMemberInformation(n),
        ascend: ns.gang.getAscensionResult(n)
      }));

    for (let member of members) {
      player = ns.getPlayer();

      /* check member ascension */
      if (shouldAscend(gang, member)) {
        let t = ns.gang.ascendMember(member.name);
        if (t) addAction(`Ascended (${member.name})`, true);
        continue;
      }

      const available_equipment = equipment.filter(e => !member.upgrades.includes(e.name)).sort((a, b) => a.cost - b.cost);
      if (available_equipment.length >= 1 && (player.money * 0.05 > available_equipment[0].cost)) {
        let t = ns.gang.purchaseEquipment(member.name, available_equipment[0].name);
        if (t) addAction(`${member.name} given ${available_equipment[0].name}`);
      }

      priority = p === undefined ? getPriority() : p;

      let task = getTask(gang, member, tasks, priority);
      if (task.name !== member.task) {
        let t = ns.gang.setMemberTask(member.name, task.name);
        if (t) addAction(`${member.name} assigned to task ${task.name}`);
      }
    }
  }

  if(time == 0) console.log("GANG | TEST DATA | ", { player, faction, gang, members, tasks, equipment, priority, p });

  display();
  time++;
  if (actions.length > 10) actions = actions.filter(a => a.time + 30 !== time);

  function display() {
    ns.clearLog();
    ns.print(`╔═════════╦═══════════════════════════════════════╗`);
    ns.print(`║ Faction ║${formatString(gang.faction + ``, 39)}║`); //add faction reputation & favor
    ns.print(`╠═════════╬═══════════════════╦═══════════════════╣`);
    ns.print(`║ ======= ║${formatString("Total", 19)}║${formatString("Rate",19)}║`);
    ns.print(`║   Money ║${formatString(ns.nFormat(player.money,'0.00a'), 19)}║${formatString(ns.nFormat(gang.moneyGainRate, '0.00a') + "/sec", 19)}║`);
    ns.print(`║ Respect ║${formatString(ns.nFormat(gang.respect,'0.00a'), 19)}║${formatString(ns.nFormat(gang.respectGainRate, '0.00a') + "/sec", 19)}║`);
    ns.print(`║  Wanted ║${formatString(ns.nFormat(gang.wantedLevel,'0.00a'), 19)}║${formatString(ns.nFormat(gang.wantedLevelGainRate, '0.00a') + "/sec", 19)}║`);
    ns.print(`║ Members ║${formatString(members.length, 19)}║${formatString("Reserved", 19)}║`); //reserved for # of respect for next member
    ns.print(`╠═════════╬════════════╦══════╩═════╦═════════════╣`);
    ns.print(`║    Name ║${formatString("Money Gain", 12)}║${formatString("Respect Gain", 12)}║${formatString("Wanted Gain", 13)}║`); //add wanted gain as well to this, shrink the columbs
    ns.print(`${members.reduce((a,b,i,r) => a += `║ ${formatString(b.name, 7)} ║${formatString(ns.nFormat(b.moneyGain, '0.00a'), 8) + "/sec"}║${formatString(ns.nFormat(b.respectGain, '0.00a'), 8) + "/sec"}║${formatString(ns.nFormat(b.wantedLevelGain, '0.00a'), 9) + "/sec"}║${i == r.length - 1 ? '' : '\n'}`, ``)}`);
    ns.print(`╠═════════╬════════════╩════════════╩═════════════╣`);
    ns.print(`║  Action ║ ${formatString(` Priority : ${priority} `, 38, "=")}║`);
    ns.print(`╠═════════╩═══════════════════════════════════════╣`);
    ns.print(`${actions.reduce((a,b,i,r) => a += `║${formatString(b.text, 49)}║${i == r.length - 1 ? '' : '\n'}`, ``)}`);
    ns.print(`╚═════════════════════════════════════════════════╝`);

    function formatString(str, length, padding = ' ') {
      str = str.toString();
      if (str.length > length)
        return str.substring(0, length - 2) + "...";
      else
        return str.padStart(length, padding);
    }
  }

  /* should add a mixed mode */
  function getPriority() {
    let [min, max, mon, mem] = priority_variables;

    if (gang.respect >= gang.wantedLevel * min) return "respect";
    if (gang.respect >= gang.wantedLevel * max) return "wanted";
    return "money";
  }

  function getSkills(isHacking) {
    return isHacking ? ["hack", "cha"] : ["agi", "def", "dex", "str"];
  }

  function shouldAscend(gang, member) {
    const level = 1.6;
    if (member.ascend === undefined) return false;

    let applicable = Object.entries(member.ascend).filter(([k, v]) => getSkills(gang.isHacking).includes(k));
    let surpass = applicable.filter(([k, v]) => v >= level);

    return surpass.length / applicable.length >= .5 ? true : false;
  }

  function getProfit(gang, member, task, priority) {
    /*
    Maximize Respect Until Soft Cap of # of Gang Members
    Maximize Money After Soft Cap reached
    Minimize Wanted Value below 10%
    */
    const softCap = 1;
    switch (priority) {
      case "respect":
        return respect();
      case "money":
        return money();
      case "wanted":
        return wanted();
    }

    function respect() {
      if (task.baseRespect === 0) return 0;
      let statWeight =
        (task.hackWeight / 100) * member.hack +
        (task.strWeight / 100) * member.str +
        (task.defWeight / 100) * member.def +
        (task.dexWeight / 100) * member.dex +
        (task.agiWeight / 100) * member.agi +
        (task.chaWeight / 100) * member.cha;
      statWeight -= 4 * task.difficulty;
      if (statWeight <= 0) return 0;
      const territoryMult = Math.max(0.005, Math.pow(gang.territory * 100, task.territory.respect) / 100);
      const territoryPenalty = (0.2 * gang.territory + 0.8) * softCap;
      if (isNaN(territoryMult) || territoryMult <= 0) return 0;
      const respectMult = wantedPenalty();
      return Math.pow(11 * task.baseRespect * statWeight * territoryMult * respectMult, territoryPenalty);
    }

    function wanted() {
      if (task.baseWanted === 0) return 0;
      let statWeight =
        (task.hackWeight / 100) * member.hack +
        (task.strWeight / 100) * member.str +
        (task.defWeight / 100) * member.def +
        (task.dexWeight / 100) * member.dex +
        (task.agiWeight / 100) * member.agi +
        (task.chaWeight / 100) * member.cha;
      statWeight -= 3.5 * task.difficulty;
      if (statWeight <= 0) return 0;
      const territoryMult = Math.max(0.005, Math.pow(gang.territory * 100, task.territory.wanted) / 100);
      if (isNaN(territoryMult) || territoryMult <= 0) return 0;
      if (task.baseWanted < 0) {
        return 0.4 * task.baseWanted * statWeight * territoryMult;
      }
      const calc = (7 * task.baseWanted) / Math.pow(3 * statWeight * territoryMult, 0.8);
      return Math.min(100, calc);
    }

    function money() {
      if (task.baseMoney === 0) return 0;
      let statWeight =
        (task.hackWeight / 100) * member.hack +
        (task.strWeight / 100) * member.str +
        (task.defWeight / 100) * member.def +
        (task.dexWeight / 100) * member.dex +
        (task.agiWeight / 100) * member.agi +
        (task.chaWeight / 100) * member.cha;
      statWeight -= 3.2 * task.difficulty;
      if (statWeight <= 0) return 0;
      const territoryMult = Math.max(0.005, Math.pow(gang.territory * 100, task.territory.money) / 100);
      if (isNaN(territoryMult) || territoryMult <= 0) return 0;
      const respectMult = wantedPenalty(gang);
      const territoryPenalty = (0.2 * gang.territory + 0.8) * softCap;
      return Math.pow(5 * task.baseMoney * statWeight * territoryMult * respectMult, territoryPenalty);
    }

    function wantedPenalty() {
      return gang.respect / (gang.respect + gang.wantedLevel);
    }
  }

  function getTask(gang, member, tasks, priority) {
    if (priority !== "wanted") return tasks.sort((a, b) => getProfit(gang, member, b, priority) - getProfit(gang, member, a, priority))[0];
    return tasks.sort((a, b) => getProfit(gang, member, a, priority) - getProfit(gang, member, b, priority))[0];
  }

  function addAction(text, display = false) {
    actions.push({
      time,
      text
    });
    if (display) ns.tprint(text);
  }
}