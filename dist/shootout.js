/* IFAB Law 10: alternating kicks, early clinch, then complete sudden-death pairs. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PenaltyRules=api;})(typeof window==='object'?window:globalThis,function(){
  const goals=kicks=>kicks.filter(Boolean).length;
  function create(first='home'){
    if(!['home','away'].includes(first))throw Error('Invalid first team');
    return {home:[],away:[],turn:first,winner:null,total:0};
  }
  function record(state,team,goal,turnId=state.total){
    if(state.winner)throw Error('Shoot-out already finished');
    if(team!==state.turn)throw Error('Wrong team turn');
    if(turnId!==state.total)throw Error('Stale or duplicate kick');
    if(typeof goal!=='boolean')throw Error('Kick result must be a boolean');
    const next={...state,home:[...state.home],away:[...state.away],total:state.total+1};
    next[team].push(goal);
    const a=goals(next.home),b=goals(next.away),na=next.home.length,nb=next.away.length;
    if(na<=5&&nb<=5){
      if(a>b+5-nb)next.winner='home';
      else if(b>a+5-na)next.winner='away';
    }else if(na===nb&&a!==b)next.winner=a>b?'home':'away';
    next.turn=team==='home'?'away':'home';
    return next;
  }
  function defend(shotCorner,keeperCorner,failedQuestion=false){
    if(!Number.isInteger(shotCorner)||shotCorner<0||shotCorner>3)throw Error('Invalid shot corner');
    if(!failedQuestion&&(!Number.isInteger(keeperCorner)||keeperCorner<0||keeperCorner>3))throw Error('Invalid keeper corner');
    return {goal:failedQuestion||shotCorner!==keeperCorner,stationary:failedQuestion};
  }
  return {create,record,goals,defend};
});
