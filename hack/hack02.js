/* */
export function manager(ns){

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

  //for each target, create a # of threads of both growth and weakening requires to gain 100%
  //if a target hack chance is >50% and money > 80%, create # of threads = to bring money to 50%
  for(let target of targets){
    hosts = hosts.filter(s => s.ram.threads(1.75) > 0);

    let g = target.analyze.grow(), w = target.analyze.weak(), h = target.analyze.hack();
    //need to determine how many are already doing g/w/h and reduce each by that #
    
    console.log({ ns, player, servers, hosts, target, g, w, h});

    for(let host of hosts){
      let threads = host.ram.threads(1.75);

      while(threads > 0){ 
        if(g > 0){

        }
        else if(w > 0){

        }
        else{

        }
        threads-=1;
      }
    }
  }
}

export function checkScriptThreads(servers, file){

}