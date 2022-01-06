/* CONSTANTS */
const task = "territory warfare";

/* GLOBAL VARIABLES */
let actions = [];
let time = 0;
let enabled = true;
let storage = [];
let gangs = ["Slum Snakes","Speakers for the Dead","The Black Hand", "The Dark Army","The Syndicate","NiteSec","Tetrads"];

export async function main(ns) {
  ns.disableLog('ALL');
  ns.tail();

  while(enabled){
    await managerTerritory(ns, ns.args[0]);
    await ns.sleep(1000);
  }
}

async function managerTerritory(ns, priority){
  let player = ns.getPlayer();
  let faction = {};
  let gang = ns.gang.getGangInformation();
  let members = ns.gang.getMemberNames().map(n => ({...ns.gang.getMemberInformation(n),ascend: ns.gang.getAscensionResult(n)}));

  gangs = gangs.map(n => ({...ns.gang.getOtherGangInformation()[n], name : n}));

  //kill gang.ns
  ns.scriptKill("/scripts/gang.ns","home");

  //set all baddies to territory warfare
  for(let member of members){
    if(member.task !== task){
      let t = ns.gang.setMemberTask(member.name, task);
      if (t) addAction(`${member.name} assigned to task ${task.name}`);
    }
  }

  //engage
  if(!gang.territoryWarfarEngaged)
    ns.gang.setTerritoryWarfare(true);

  

  if(time == 0){
    storage = {
      members : [...members],
      gang : { ...gang }, 
    };

    console.log("TERRITORY | TEST DATA | ", { storage, player, faction, gangs, gang, members, priority, task });
  }

  //if gang member dies => execute gang.ns, exist manager 
  if(storage.members.length !== members.length){
    enabled = false;
    ns.gang.setTerritoryWarfare(false);
    let names = storage.members.filter(a => !members.map(b => b.name).includes(a.name));
    for(let name of names)
      addAction(`${name} killed in territorial combat, exiting combat.`, true);

    //exec script
    ns.exec('scripts/gang.ns', 'home', 1, priority);
  }

  //if territory goes below a certain value (10%) => reset as well

  display();
  time++;
  if (actions.length > 10) actions = actions.filter(a => a.time + 30 !== time);

  function display(){

  }

  function addAction(text, display = false) {
    actions.push({
      time,
      text
    });
    if (display) ns.tprint(text);
  }
}