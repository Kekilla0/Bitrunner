/* 10.30gb Ram */
export function getAll(ns){
  let visited = { home : get(ns, 'home')}, que = Object.keys(visited), name = "";
  while(name = que.pop()){
    let scan = ns.scan(name);
    for(let result of scan){
      if(visited[result] === undefined){
        que.push(result);
        visited[result] = get(ns, result);
      }  
    }
  }
  return Object.values(visited);
}

export function get(ns, name){
  let data = ns.getServer(name);

  return {
    name,
    actions : [],
    hack : {
      level : data.requiredHackingSkill, 
      ports : data.numOpenPortsRequired,
      admin : data.hasAdminRights,
      backdoor : data.backdoorInstalled,
      success : ns.hackAnalyzeChance(name),
    },
    security : {
      base : data.baseDifficulty,
      level : data.hackDifficulty,
      min : data.minDifficulty,
    },
    money : {
      available : data.moneyAvailable,
      max : data.moneyMax,
      profit : (data.moneyMax * data.serverGrowth) / (2.5 * data.requiredHackingSkill * data.minDifficulty + 500) / (1e7),
    },
    ram : {
      max : data.maxRam,
      used : data.ramUsed,
      percent : .9,
      threads : function(v){ ;
        return Math.max(0, Math.floor(((ns.getServerMaxRam(name) * this.percent) - ns.getServerUsedRam(name) - (name == 'home' ? 50 : 0))/v)); 
      },
    },
    files : {
      running : ns.ps(name),
      installed : ns.ls(name),
    },
    analyze : {
      grow : function(player, servers, core = 1){
        let growth = data.moneyMax/data.moneyAvailable;

        if(isNaN(growth)) return 0;
        return ns.growthAnalyze(name,Math.max(1, growth), core) - servers.reduce((a,b) => a+= b.files.running.filter(f => f.filename == player.files[2].name && f.args.includes(name)).reduce((c,d) => c += d.threads, 0), 0);
      },
      hack : function(player, servers){
        return (data.moneyAvailable - data.moneyMax/2)/(ns.hackAnalyze(name) * data.moneyAvailable) - servers.reduce((a,b) => a+= b.files.running.filter(f => f.filename == player.files[1].name && f.args.includes(name)).reduce((c,d) => c += d.threads, 0), 0);
      },
      weak : function(player, servers,threads = 1, cores = 1){
        return ((data.hackDifficulty - data.minDifficulty) / ns.weakenAnalyze(threads, cores)) - servers.reduce((a,b) => a+= b.files.running.filter(f => f.filename == player.files[0].name && f.args.includes(name)).reduce((c,d) => c += d.threads, 0), 0);
      }
    },
    getAction : function(){
      if(this.money.available < this.money.max * .8) return 'G';
      if(this.security.level > this.security.min + 5) return 'W';
      return 'H';
    },
  }
}