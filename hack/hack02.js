import * as server_info from '/scripts/server.js';
import * as player_info from '/scripts/player.js';

/* */
export async function manager(ns){
  let servers = server_info.getAll(ns);
  let player  = player_info.getAll(ns);

  for(let server of servers.filter(s => player.hacking.level >= s.hack.level && player.exes.length >= s.hack.ports))
    root(ns, player, server);

  for(let server of servers.filter(s => !player.files.reduce((a,b) => a && s.files.installed.includes(b.name), true)))
    await copy_files(ns, player, server);

  hack(ns, player, server);
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
    
    let [ wf, hf, gf ] = player.files;
    let gt = target.analyze.grow(), wt = target.analyze.weak(), ht = target.analyze.hack();
    
    console.log({ ns, player, servers, hosts, target, g, w, h, wf, hf, gf});

    for(let host of hosts){
      let threads = host.ram.threads(1.75);

      while(threads > 0){
        let pid = 0; 
        if(gt > 0)
          pid = ns.exec(gf.name, host.name, 1, target.name, id());
        else if(wt > 0)
          pid = ns.exec(wf.name, host.name, 1, target.name, id());
        else if(ht > 0)
          pid = ns.exec(hf.name, host.name, 1, target.name, id());
        else if(gt == 0 && wt == 0 & ht == 0 && threads > 0)
          threads = 0;

        threads-=(pid > 0 ? 1: 0);
      }
    }
  }
}