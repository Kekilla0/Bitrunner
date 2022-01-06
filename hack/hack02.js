import * as server_info from '/scripts/server.js';
import * as player_info from '/scripts/player.js';



/* 13.10gb */
export async function main(ns){
  let time = 0;

  while(true){
    const {player, servers} = await manager();
    display(ns, player, servers);
    time++;
  }
}

/* Can be used as an import or as a stand alone*/
export async function manager(ns){
  let servers = server_info.getAll(ns);
  let player  = player_info.getAll(ns);

  for(let server of servers.filter(s => player.hacking.level >= s.hack.level && player.exes.length >= s.hack.ports))
    root(ns, player, server);

  for(let server of servers.filter(s => !player.files.reduce((a,b) => a && s.files.installed.includes(b.name), true)))
    await copy_files(ns, player, server);

  hack(ns, player, servers);
}

export function root(ns, player, server){
  for(let exe of player.exes)
    ns[exe](server.name);
  ns.nuke(server.name);
}

export async function copy_files(ns, player, server){
  await ns.scp(player.files.map(f => f.name), 'home', server.name);
}

export function hack(ns, player, servers){
  let id = (l=16) => `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.substring(0,l);
  let hosts = servers.filter(s =>player.hacking.level >= s.hack.level && player.exes.length >= s.hack.ports).sort((a,b)=> b.ram.threads(1.75) - a.ram.threads(1.75)); 
  let targets = servers.filter(s => s.money.profit != 0).sort((a,b) => b.money.profit - a.money.profit).map(s =>{ s.actions = []; return s });  

  for(let target of targets){
    hosts = hosts.filter(s => s.ram.threads(1.75) > 0);
    
    let files = player.files;
    let thread_analysis = [ target.analyze.grow(), target.analyze.weak(), target.analyze.hack()];
    
    console.log({ ns, player, servers, hosts, target, g, w, h, wf, hf, gf});

    for(let host of hosts){
      let threads = host.ram.threads(1.75);

      while(threads > 0){
        for(let i = 0; i < files.length; i++){
          let file = files[i], analysis = thread_analysis[i];

          if(analysis == 0) continue;

          if(threads > analysis){
            host.exec(file, target, analysis);
            threads -= analysis;
            thread_analysis[i] = 0;
          }else{
            host.exec(file, target, threads);
            thread_analysis[i] -= threads;
            threads = 0;
          }
        }
      }
    }
  }
}

//Brainstorm how we want this to look
function display(ns, player, servers){
  ns.clearLog();
}