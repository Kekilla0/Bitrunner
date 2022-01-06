/* 2.20gb Ram */
export function get(ns){
  let data = ns.getPlayer();

  let output_object = {
    money : data.money,
    files : [
      { key : "W", name : "weak.script", cmd : "weaken(args);", size : 1.75,},
      { key : "H", name : "hack.script", cmd : "hack(args)", size : 1.75},
      { key : "G", name : "grow.script", cmd : "grow(args)", size : 1.75},
    ],
    exes : ["brutessh","ftpcrack","relaysmtp","sqlinject","httpworm"].filter(e => ns.fileExists(`${e}.exe`)),
  };

  let stat_array = ["agility", "charisma", "defense", "dexterity", "hacking", "strength"].forEach(stat =>{  output_object[stat] = { exp : data[`${stat}_exp`] , mult : data[`${stat}_mult`], level : data[stat] }; });

  return output_object;
}