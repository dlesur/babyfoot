// js/statistics.js
// ============================================================
// Statistiques marrantes et records
// ============================================================

import {
  state, onStateReady, recomputeAllEloFull,
  computePlayerStats, getDisplayName, formatDateShort
} from "./app.js";

let allSorted = [];

onStateReady(() => {
  const { sorted } = recomputeAllEloFull();
  allSorted = sorted;
  renderAllStatistics();
});

// ─── Helper pour obtenir les stats d'un joueur ─────────────
function getPlayerStats(playerId) {
  return computePlayerStats(playerId, allSorted);
}

// ─── SECTION 1: ATTAQUE/DÉFENSE ───────────────────────────
function renderAttackDefense() {
  const players = Object.values(state.players);
  if (players.length === 0) return;

  // Meilleur buteur (Moyenne en attaque)
  let attackers = [];
  let bestBalancers = [];
  let specialists = [];
  let bestDefenders = [];
  let attackRatios = [];
  let defenseRatios = [];
  let ratios1v1 = [];

  for (const p of players) {
    const stats = getPlayerStats(p.id);
    if (!stats || stats.totalMatches === 0) continue;

    // Meilleur buteur: Moyenne de buts marqués par match en attaque (minimum 10 matchs)
    let attackGoals = 0;
    for (const match of allSorted) {
      const inA = match.teamA.some(p2 => p2.playerId === p.id);
      const inB = match.teamB.some(p2 => p2.playerId === p.id);
      if (!inA && !inB) continue;

      const playerSlot = (inA ? match.teamA : match.teamB).find(p2 => p2.playerId === p.id);
      if (playerSlot?.role === "attaque") {
        // On compte les buts réels marqués par son équipe
        attackGoals += inA ? match.scoreA : match.scoreB;
      }
    }

    if (stats.matchesAtt >= 10) {
      const avgGoals = (attackGoals / stats.matchesAtt).toFixed(2);
      attackers.push({
        id: p.id,
        name: getDisplayName(p.id),
        goals: attackGoals,
        matches: stats.matchesAtt,
        avg: parseFloat(avgGoals)
      });
    }

    // Meilleur défenseur: moins de buts encaissés en défense (minimum 10 matchs)
    let goalsConceded = 0;
    for (const match of allSorted) {
      const inA = match.teamA.some(p2 => p2.playerId === p.id);
      const inB = match.teamB.some(p2 => p2.playerId === p.id);
      if (!inA && !inB) continue;

      const playerSlot = (inA ? match.teamA : match.teamB).find(p2 => p2.playerId === p.id);
      if (playerSlot?.role === "defense") {
        if (inA) {
          goalsConceded += match.scoreB;
        } else {
          goalsConceded += match.scoreA;
        }
      }
    }

    if (stats.matchesDef >= 10) {
      const avgGoals = (goalsConceded / stats.matchesDef).toFixed(2);
      bestDefenders.push({
        id: p.id,
        name: getDisplayName(p.id),
        goals: goalsConceded,
        matches: stats.matchesDef,
        avg: parseFloat(avgGoals)
      });
    }

    // Meilleur équilibriste: ratio att/def le plus proche de 1
    if (stats.matchesAtt > 0 && stats.matchesDef > 0) {
      const ratio = Math.abs(stats.matchesAtt - stats.matchesDef);
      bestBalancers.push({
        id: p.id,
        name: getDisplayName(p.id),
        att: stats.matchesAtt,
        def: stats.matchesDef,
        diff: ratio
      });
    }

    // Spécialiste attaque: % d'attaque le plus élevé
    if (stats.matchesAtt > 0 || stats.matchesDef > 0) {
      const total = stats.matchesAtt + stats.matchesDef;
      const pct = Math.round((stats.matchesAtt / total) * 100);
      specialists.push({
        id: p.id,
        name: getDisplayName(p.id),
        pct: pct
      });
    }

    // Meilleur ratio de victoires en attaque (minimum 10 matchs en attaque)
    if (stats.matchesAtt >= 10) {
      let attackWinsCount = 0;
      for (const match of allSorted) {
        const inA = match.teamA.some(p2 => p2.playerId === p.id);
        const inB = match.teamB.some(p2 => p2.playerId === p.id);
        if (!inA && !inB) continue;

        const playerSlot = (inA ? match.teamA : match.teamB).find(p2 => p2.playerId === p.id);
        if (playerSlot?.role === "attaque") {
          const won = (inA && match.scoreA > match.scoreB) || (inB && match.scoreB > match.scoreA);
          if (won) attackWinsCount++;
        }
      }
      
      const attackRatioPct = Math.round((attackWinsCount / stats.matchesAtt) * 100);
      attackRatios.push({
        id: p.id,
        name: getDisplayName(p.id),
        pct: attackRatioPct,
        wins: attackWinsCount,
        matches: stats.matchesAtt
      });
    }

    // Meilleur ratio de victoires en défense (minimum 10 matchs en défense)
    if (stats.matchesDef >= 10) {
      let defenseWinsCount = 0;
      for (const match of allSorted) {
        const inA = match.teamA.some(p2 => p2.playerId === p.id);
        const inB = match.teamB.some(p2 => p2.playerId === p.id);
        if (!inA && !inB) continue;

        const playerSlot = (inA ? match.teamA : match.teamB).find(p2 => p2.playerId === p.id);
        if (playerSlot?.role === "defense") {
          const won = (inA && match.scoreA > match.scoreB) || (inB && match.scoreB > match.scoreA);
          if (won) defenseWinsCount++;
        }
      }
      
      const defenseRatioPct = Math.round((defenseWinsCount / stats.matchesDef) * 100);
      defenseRatios.push({
        id: p.id,
        name: getDisplayName(p.id),
        pct: defenseRatioPct,
        wins: defenseWinsCount,
        matches: stats.matchesDef
      });
    }

    // Meilleur 1v1 (1 joueur vs 1 joueur)
    let matches1v1 = 0;
    let wins1v1 = 0;
    for (const match of allSorted) {
      // 1v1 = exactement 1 joueur par équipe
      if (match.teamA.length !== 1 || match.teamB.length !== 1) continue;

      const inA = match.teamA.some(p2 => p2.playerId === p.id);
      const inB = match.teamB.some(p2 => p2.playerId === p.id);
      if (!inA && !inB) continue;

      matches1v1++;
      const won = (inA && match.scoreA > match.scoreB) || (inB && match.scoreB > match.scoreA);
      if (won) wins1v1++;
    }

    if (matches1v1 >= 5) {
      const ratio1v1Pct = Math.round((wins1v1 / matches1v1) * 100);
      ratios1v1.push({
        id: p.id,
        name: getDisplayName(p.id),
        pct: ratio1v1Pct,
        wins: wins1v1,
        matches: matches1v1
      });
    }
  }

  // Trier tous les classements
  attackers.sort((a, b) => b.avg - a.avg);
  bestDefenders.sort((a, b) => a.avg - b.avg);
  bestBalancers.sort((a, b) => a.diff - b.diff);
  specialists.sort((a, b) => b.pct - a.pct);
  attackRatios.sort((a, b) => b.pct - a.pct);
  defenseRatios.sort((a, b) => b.pct - a.pct);
  ratios1v1.sort((a, b) => b.pct - a.pct);

  // Remplir les éléments du DOM
  if (attackers.length > 0) {
    const attacker = attackers[0];
    document.getElementById("bestAttackerInfo").innerHTML = `
      <div class="stat-player-name" style="color:${state.players[attacker.id]?.color}">${attacker.name}</div>
      <div class="stat-detail">${attacker.avg} buts/match (${attacker.goals} en ${attacker.matches})</div>
      ${attackers.length > 1 ? `<div class="stat-detail stat-secondary">2e: ${attackers[1].name} (${attackers[1].avg})</div>` : ''}
    `;
  }

  if (bestDefenders.length > 0) {
    const defender = bestDefenders[0];
    document.getElementById("bestDefenderInfo").innerHTML = `
      <div class="stat-player-name" style="color:${state.players[defender.id]?.color}">${defender.name}</div>
      <div class="stat-detail">${defender.avg} buts/match (${defender.goals} en ${defender.matches})</div>
      ${bestDefenders.length > 1 ? `<div class="stat-detail stat-secondary">2e: ${bestDefenders[1].name} (${bestDefenders[1].avg})</div>` : ''}
    `;
  }

  if (bestBalancers.length > 0) {
    const balancer = bestBalancers[0];
    document.getElementById("attackDefenseRatioInfo").innerHTML = `
      <div class="stat-player-name" style="color:${state.players[balancer.id]?.color}">${balancer.name}</div>
      <div class="stat-detail">${balancer.att}A / ${balancer.def}D</div>
      ${bestBalancers.length > 1 ? `<div class="stat-detail stat-secondary">2e: ${bestBalancers[1].name} (${bestBalancers[1].att}A/${bestBalancers[1].def}D)</div>` : ''}
    `;
  }

  if (specialists.length > 0) {
    const specialist = specialists[0];
    document.getElementById("attackSpecialistInfo").innerHTML = `
      <div class="stat-player-name" style="color:${state.players[specialist.id]?.color}">${specialist.name}</div>
      <div class="stat-detail">${specialist.pct}% en attaque</div>
      ${specialists.length > 1 ? `<div class="stat-detail stat-secondary">2e: ${specialists[1].name} (${specialists[1].pct}%)</div>` : ''}
    `;
  }

  if (attackRatios.length > 0) {
    const ratio = attackRatios[0];
    document.getElementById("bestAttackRatioInfo").innerHTML = `
      <div class="stat-player-name" style="color:${state.players[ratio.id]?.color}">${ratio.name}</div>
      <div class="stat-detail">${ratio.pct}% (${ratio.wins}/${ratio.matches})</div>
      ${attackRatios.length > 1 ? `<div class="stat-detail stat-secondary">2e: ${attackRatios[1].name} (${attackRatios[1].pct}%)</div>` : ''}
    `;
  }

  if (defenseRatios.length > 0) {
    const ratio = defenseRatios[0];
    document.getElementById("bestDefenseRatioInfo").innerHTML = `
      <div class="stat-player-name" style="color:${state.players[ratio.id]?.color}">${ratio.name}</div>
      <div class="stat-detail">${ratio.pct}% (${ratio.wins}/${ratio.matches})</div>
      ${defenseRatios.length > 1 ? `<div class="stat-detail stat-secondary">2e: ${defenseRatios[1].name} (${defenseRatios[1].pct}%)</div>` : ''}
    `;
  }

  if (ratios1v1.length > 0) {
    const ratio = ratios1v1[0];
    document.getElementById("best1v1Info").innerHTML = `
      <div class="stat-player-name" style="color:${state.players[ratio.id]?.color}">${ratio.name}</div>
      <div class="stat-detail">${ratio.pct}% (${ratio.wins}/${ratio.matches})</div>
      ${ratios1v1.length > 1 ? `<div class="stat-detail stat-secondary">2e: ${ratios1v1[1].name} (${ratios1v1[1].pct}%)</div>` : ''}
    `;
  }
}

// ─── SECTION 2: RECORDS PERSONNELS ───────────────────────
function renderPersonalRecords() {
  const players = Object.values(state.players);
  if (players.length === 0) return;

  let bestWinStreak = { id: null, name: "", wins: 0 };
  let bestWinRate = { id: null, name: "", pct: 0, matches: 0 };
  let mostConsistent = { id: null, name: "", matches: 0 };
  let newestPlayer = null;
  let maxCreatedAt = null;

  for (const p of players) {
    const stats = getPlayerStats(p.id);
    if (!stats || stats.totalMatches === 0) continue;

    // Meilleure série
    if (stats.bestserie > bestWinStreak.wins) {
      bestWinStreak = { id: p.id, name: getDisplayName(p.id), wins: stats.bestserie };
    }

    // Meilleur taux de victoire (min 5 matchs)
    if (stats.totalMatches >= 5) {
      const pct = parseFloat(stats.winPct);
      if (pct > bestWinRate.pct || (pct === bestWinRate.pct && stats.totalMatches > bestWinRate.matches)) {
        bestWinRate = { id: p.id, name: getDisplayName(p.id), pct, matches: stats.totalMatches };
      }
    }

    // Plus constant (le plus de matchs)
    if (stats.totalMatches > mostConsistent.matches) {
      mostConsistent = { id: p.id, name: getDisplayName(p.id), matches: stats.totalMatches };
    }

    // Nouveau venu (le plus récemment ajouté)
    const createdAt = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
    if (!maxCreatedAt || createdAt > maxCreatedAt) {
      maxCreatedAt = createdAt;
      newestPlayer = { id: p.id, name: getDisplayName(p.id), date: formatDateShort(createdAt) };
    }
  }

  // Remplir les éléments
  if (bestWinStreak.id) {
    document.getElementById("winStreakInfo").innerHTML = `
      <div class="stat-player-name" style="color:${state.players[bestWinStreak.id]?.color}">${bestWinStreak.name}</div>
      <div class="stat-detail">${bestWinStreak.wins} victoires consécutives 🔥</div>
    `;
  }

  if (bestWinRate.id) {
    document.getElementById("winRateInfo").innerHTML = `
      <div class="stat-player-name" style="color:${state.players[bestWinRate.id]?.color}">${bestWinRate.name}</div>
      <div class="stat-detail">${bestWinRate.pct}% de domination</div>
    `;
  }

  if (mostConsistent.id) {
    document.getElementById("mostConsistentInfo").innerHTML = `
      <div class="stat-player-name" style="color:${state.players[mostConsistent.id]?.color}">${mostConsistent.name}</div>
      <div class="stat-detail">${mostConsistent.matches} matchs sans pause</div>
    `;
  }

  if (newestPlayer) {
    document.getElementById("newestPlayerInfo").innerHTML = `
      <div class="stat-player-name" style="color:${state.players[newestPlayer.id]?.color}">${newestPlayer.name}</div>
      <div class="stat-detail">Arrivé le ${newestPlayer.date}</div>
    `;
  }
}

// ─── SECTION 3: CLASSEMENTS ATTAQUE/DÉFENSE ────────────────
function renderRankings() {
  const players = Object.values(state.players);
  if (players.length === 0) return;

  let attackRankings = [];
  let defenseRankings = [];

  for (const p of players) {
    let attackWins = 0, attackTotal = 0;
    let defenseWins = 0, defenseTotal = 0;

    for (const match of allSorted) {
      const inA = match.teamA.some(p2 => p2.playerId === p.id);
      const inB = match.teamB.some(p2 => p2.playerId === p.id);
      if (!inA && !inB) continue;

      const playerSlot = (inA ? match.teamA : match.teamB).find(p2 => p2.playerId === p.id);
      const won = (inA && match.scoreA > match.scoreB) || (inB && match.scoreB > match.scoreA);

      if (playerSlot?.role === "attaque") {
        attackTotal++;
        if (won) attackWins++;
      } else if (playerSlot?.role === "defense") {
        defenseTotal++;
        if (won) defenseWins++;
      }
    }

    if (attackTotal >= 5) {
      const pct = Math.round((attackWins / attackTotal) * 100);
      attackRankings.push({
        id: p.id,
        name: getDisplayName(p.id),
        pct: pct,
        wins: attackWins,
        total: attackTotal
      });
    }

    if (defenseTotal >= 5) {
      const pct = Math.round((defenseWins / defenseTotal) * 100);
      defenseRankings.push({
        id: p.id,
        name: getDisplayName(p.id),
        pct: pct,
        wins: defenseWins,
        total: defenseTotal
      });
    }
  }

  // Trier par pourcentage
  attackRankings.sort((a, b) => b.pct - a.pct);
  defenseRankings.sort((a, b) => b.pct - a.pct);

  // Générer HTML pour attaque
  const attackList = document.getElementById("attackRankingList");
  if (attackList) {
    if (attackRankings.length === 0) {
      attackList.innerHTML = '<div class="ranking-empty">Aucune donnée (min 5 matchs)</div>';
    } else {
      attackList.innerHTML = attackRankings.map((r, idx) => `
        <div class="ranking-item">
          <div class="ranking-position">#${idx + 1}</div>
          <div class="ranking-info">
            <div class="ranking-name" style="color:${state.players[r.id]?.color}">${r.name}</div>
            <div class="ranking-stat">${r.pct}% (${r.wins}/${r.total})</div>
          </div>
        </div>
      `).join("");
    }
  }

  // Générer HTML pour défense
  const defenseList = document.getElementById("defenseRankingList");
  if (defenseList) {
    if (defenseRankings.length === 0) {
      defenseList.innerHTML = '<div class="ranking-empty">Aucune donnée (min 5 matchs)</div>';
    } else {
      defenseList.innerHTML = defenseRankings.map((r, idx) => `
        <div class="ranking-item">
          <div class="ranking-position">#${idx + 1}</div>
          <div class="ranking-info">
            <div class="ranking-name" style="color:${state.players[r.id]?.color}">${r.name}</div>
            <div class="ranking-stat">${r.pct}% (${r.wins}/${r.total})</div>
          </div>
        </div>
      `).join("");
    }
  }
}

// ─── SECTION 4: MATCHUPS & RIVALITÉS ───────────────────────
function renderMatchups() {
  const players = Object.values(state.players);
  if (players.length < 2) return;

  let worstEnemy = { p1: null, p2: null, p1Losses: 0 };
  let mainRival = { p1: null, p2: null, totalMatches: 0 };
  let bestTeam2v2 = { p1: null, p2: null, wins: 0 };
  let worstTeam2v2 = { p1: null, p2: null, losses: 0 };

  // Analyser les rivalités 1v1 et 2v2
  for (const p of players) {
    const stats = getPlayerStats(p.id);
    if (!stats) continue;

    // Pire ennemi (le plus de défaites contre une personne)
    for (const opp of stats.oppList) {
      if (opp.losses > worstEnemy.p1Losses) {
        worstEnemy = {
          p1: p.id,
          p1Name: getDisplayName(p.id),
          p2: opp.id,
          p2Name: opp.name,
          p1Losses: opp.losses,
          p2Wins: opp.wins
        };
      }
    }

    // Rival principal (le plus de matchs contre une personne)
    for (const opp of stats.oppList) {
      const total = opp.wins + opp.losses + opp.draws;
      if (total > mainRival.totalMatches) {
        mainRival = {
          p1: p.id,
          p1Name: getDisplayName(p.id),
          p2: opp.id,
          p2Name: opp.name,
          totalMatches: total
        };
      }
    }

    // Meilleures paires 2v2 (via teammates record)
    for (const tm of stats.teammateList) {
      if (tm.wins > bestTeam2v2.wins) {
        bestTeam2v2 = {
          p1: p.id,
          p1Name: getDisplayName(p.id),
          p2: tm.id,
          p2Name: tm.name,
          wins: tm.wins
        };
      }

      if (tm.losses > worstTeam2v2.losses) {
        worstTeam2v2 = {
          p1: p.id,
          p1Name: getDisplayName(p.id),
          p2: tm.id,
          p2Name: tm.name,
          losses: tm.losses
        };
      }
    }
  }

  // Remplir les éléments
  if (worstEnemy.p1) {
    document.getElementById("worstEnemyInfo").innerHTML = `
      <div class="matchup-players">
        <span style="color:${state.players[worstEnemy.p1]?.color}">${worstEnemy.p1Name}</span>
        vs
        <span style="color:${state.players[worstEnemy.p2]?.color}">${worstEnemy.p2Name}</span>
      </div>
      <div class="matchup-score">${worstEnemy.p2Wins} victoires : ${worstEnemy.p1Losses} défaites</div>
    `;
  }

  if (mainRival.p1) {
    document.getElementById("rivalInfo").innerHTML = `
      <div class="matchup-players">
        <span style="color:${state.players[mainRival.p1]?.color}">${mainRival.p1Name}</span>
        vs
        <span style="color:${state.players[mainRival.p2]?.color}">${mainRival.p2Name}</span>
      </div>
      <div class="matchup-score">${mainRival.totalMatches} matchs au total ⚔️</div>
    `;
  }

  if (bestTeam2v2.p1) {
    document.getElementById("bestTeamInfo").innerHTML = `
      <div class="matchup-players">
        <span style="color:${state.players[bestTeam2v2.p1]?.color}">${bestTeam2v2.p1Name}</span>
        &
        <span style="color:${state.players[bestTeam2v2.p2]?.color}">${bestTeam2v2.p2Name}</span>
      </div>
      <div class="matchup-score">${bestTeam2v2.wins} victoires ensemble</div>
    `;
  }

  if (worstTeam2v2.p1) {
    document.getElementById("worstTeamInfo").innerHTML = `
      <div class="matchup-players">
        <span style="color:${state.players[worstTeam2v2.p1]?.color}">${worstTeam2v2.p1Name}</span>
        &
        <span style="color:${state.players[worstTeam2v2.p2]?.color}">${worstTeam2v2.p2Name}</span>
      </div>
      <div class="matchup-score">${worstTeam2v2.losses} défaites ensemble 😅</div>
    `;
  }
}

// ─── SECTION 4: BADGES AMUSANTS ───────────────────────────
function renderBadges() {
  const players = Object.values(state.players);
  const badges = [];

  const badges_config = [
    {
      name: "🔥 Le Destructeur",
      desc: "Meilleure série de victoires",
      award: () => {
        let best = null, bestWins = 0;
        for (const p of players) {
          const stats = getPlayerStats(p.id);
          if (stats && stats.bestserie > bestWins) {
            bestWins = stats.bestserie;
            best = p;
          }
        }
        return best ? { player: best, value: bestWins } : null;
      }
    },
    {
      name: "💪 L'Invincible",
      desc: "Meilleur taux de victoire",
      award: () => {
        let best = null, bestPct = 0, bestMatches = 0;
        for (const p of players) {
          const stats = getPlayerStats(p.id);
          if (stats && stats.totalMatches >= 5) {
            const pct = parseFloat(stats.winPct);
            if (pct > bestPct || (pct === bestPct && stats.totalMatches > bestMatches)) {
              bestPct = pct;
              bestMatches = stats.totalMatches;
              best = p;
            }
          }
        }
        return best ? { player: best, value: bestPct } : null;
      }
    },
    {
      name: "⚽ Le Guerrier",
      desc: "Plus de matchs joués",
      award: () => {
        let best = null, maxMatches = 0;
        for (const p of players) {
          const stats = getPlayerStats(p.id);
          if (stats && stats.totalMatches > maxMatches) {
            maxMatches = stats.totalMatches;
            best = p;
          }
        }
        return best ? { player: best, value: maxMatches } : null;
      }
    },
    {
      name: "👑 Le Roi ELO",
      desc: "Meilleur classement ELO",
      award: () => {
        let best = null, maxElo = 0;
        for (const p of players) {
          if (p.elo > maxElo) {
            maxElo = p.elo;
            best = p;
          }
        }
        return best ? { player: best, value: Math.round(maxElo) } : null;
      }
    },
    {
      name: "🎯 Le Buteur Roi",
      desc: "Meilleure moyenne de buts en attaque",
      award: () => {
        let best = null, bestAvg = 0, bestValueStr = "";
        for (const p of players) {
          const stats = getPlayerStats(p.id);
          if (!stats || stats.matchesAtt < 10) continue;

          let attackGoals = 0;
          for (const match of allSorted) {
            const inA = match.teamA.some(p2 => p2.playerId === p.id);
            const inB = match.teamB.some(p2 => p2.playerId === p.id);
            if (!inA && !inB) continue;

            const playerSlot = (inA ? match.teamA : match.teamB).find(p2 => p2.playerId === p.id);
            if (playerSlot?.role === "attaque") {
              attackGoals += inA ? match.scoreA : match.scoreB;
            }
          }
          
          const avg = attackGoals / stats.matchesAtt;
          if (avg > bestAvg) {
            bestAvg = avg;
            best = p;
            bestValueStr = `${avg.toFixed(2)}/m`;
          }
        }
        return best ? { player: best, value: bestValueStr } : null;
      }
    },
    {
      name: "🛡️ Le Bastion",
      desc: "Plus de matchs en défense",
      award: () => {
        let best = null, maxDef = 0;
        for (const p of players) {
          const stats = getPlayerStats(p.id);
          if (stats && stats.matchesDef > maxDef) {
            maxDef = stats.matchesDef;
            best = p;
          }
        }
        return best ? { player: best, value: maxDef } : null;
      }
    }
  ];

  badges_config.forEach(badge => {
    const result = badge.award();
    if (result) {
      badges.push({
        ...badge,
        playerId: result.player.id,
        playerName: getDisplayName(result.player.id),
        value: result.value
      });
    }
  });

  const container = document.getElementById("badgesContainer");
  container.innerHTML = badges.map(b => `
    <div class="badge-card">
      <div class="badge-icon">${b.name.split(' ')[0]}</div>
      <div class="badge-info">
        <div class="badge-title">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
        <div class="badge-holder" style="color:${state.players[b.playerId]?.color}">
          ${b.playerName} - ${b.value}
        </div>
      </div>
    </div>
  `).join("");
}

// ─── SECTION 5: FAITS DIVERS & BRAQUAGES ───────────────────
function renderFacts() {
  const facts = [];
  const players = Object.values(state.players);

  if (players.length === 0) {
    document.getElementById("factsContainer").innerHTML = '<div class="empty-state">Aucune donnée disponible</div>';
    return;
  }

  // --- FAITS CLASSIQUES ---
  const totalMatches = allSorted.length;
  if (totalMatches > 0) {
    facts.push({
      icon: "📊",
      text: `${totalMatches} matchs ont été joués sur ce terrain`
    });
  }

  let hottest = null, maxElo = 0;
  for (const p of players) {
    if (p.elo > maxElo) {
      maxElo = p.elo;
      hottest = p;
    }
  }
  if (hottest) {
    facts.push({
      icon: "🔥",
      text: `${getDisplayName(hottest.id)} est en feu avec un ELO de ${Math.round(hottest.elo)} !`
    });
  }

  let maxScore = 0, maxMatch = null;
  for (const match of allSorted) {
    const score = match.scoreA + match.scoreB;
    if (score > maxScore) {
      maxScore = score;
      maxMatch = match;
    }
  }
  if (maxMatch) {
    const playersA = maxMatch.teamA.map(p => getDisplayName(p.playerId)).join(" & ");
    const playersB = maxMatch.teamB.map(p => getDisplayName(p.playerId)).join(" & ");
    facts.push({
      icon: "💥",
      text: `Le match le plus fou: ${playersA} ${maxMatch.scoreA}-${maxMatch.scoreB} ${playersB} (${maxScore} buts!)`
    });
  }

  let biggestVictory = { diff: 0, match: null };
  for (const match of allSorted) {
    const diff = Math.abs(match.scoreA - match.scoreB);
    if (diff > biggestVictory.diff && diff > 0) {
      biggestVictory = { diff, match };
    }
  }
  if (biggestVictory.match) {
    const winner = biggestVictory.match.scoreA > biggestVictory.match.scoreB
      ? biggestVictory.match.teamA.map(p => getDisplayName(p.playerId)).join(" & ")
      : biggestVictory.match.teamB.map(p => getDisplayName(p.playerId)).join(" & ");
    facts.push({
      icon: "🏆",
      text: `La victoire la plus écrasante: ${winner} gagne avec ${biggestVictory.diff} buts d'écart!`
    });
  }

  // --- NOUVEAU: LES BRAQUAGES (ELO + ANALYSE DES ROLES) ---
  
  // 1. Pré-calculer le taux de victoire global de chaque joueur dans ses rôles
  const roleStats = {};
  for (const p of players) {
    let attWins = 0, attMatches = 0;
    let defWins = 0, defMatches = 0;
    
    for (const match of allSorted) {
      const inA = match.teamA.some(p2 => p2.playerId === p.id);
      const inB = match.teamB.some(p2 => p2.playerId === p.id);
      if (!inA && !inB) continue;
      
      const won = (inA && match.scoreA > match.scoreB) || (inB && match.scoreB > match.scoreA);
      const slot = (inA ? match.teamA : match.teamB).find(p2 => p2.playerId === p.id);
      
      if (slot?.role === "attaque") { 
        attMatches++; 
        if (won) attWins++; 
      }
      if (slot?.role === "defense") { 
        defMatches++; 
        if (won) defWins++; 
      }
    }
    
    roleStats[p.id] = {
      attPct: attMatches > 0 ? (attWins / attMatches) : 0.5,
      defPct: defMatches > 0 ? (defWins / defMatches) : 0.5
    };
  }

  let upsets = [];
  for (const match of allSorted) {
    if (match.scoreA === match.scoreB) continue; // On ignore les nuls

    const teamAWon = match.scoreA > match.scoreB;
    const winnerTeam = teamAWon ? match.teamA : match.teamB;
    const loserTeam = teamAWon ? match.teamB : match.teamA;
    const winnerScore = teamAWon ? match.scoreA : match.scoreB;
    const loserScore = teamAWon ? match.scoreB : match.scoreA;

    // Calcul de l'ELO moyen
    const getAvgElo = (team) => {
      if (team.length === 0) return 1000;
      const total = team.reduce((sum, p) => sum + (state.players[p.playerId]?.elo || 1000), 0);
      return total / team.length;
    };

    // Calcul de la "Force dans ce rôle" basée sur le winrate historique du joueur à ce poste
    const getRoleStrength = (team) => {
      if (team.length === 0) return 0.5;
      let total = 0;
      for (const p of team) {
        const stats = roleStats[p.playerId];
        if (p.role === "attaque") total += stats ? stats.attPct : 0.5;
        else if (p.role === "defense") total += stats ? stats.defPct : 0.5;
        else total += 0.5; // Sécurité si le rôle n'est pas défini
      }
      return total / team.length; // Pourcentage moyen de compétence de l'équipe dans ces rôles
    };

    const winnerElo = getAvgElo(winnerTeam);
    const loserElo = getAvgElo(loserTeam);
    
    const winnerRoleStrength = getRoleStrength(winnerTeam);
    const loserRoleStrength = getRoleStrength(loserTeam);

    // Etape 1 : Le déficit d'ELO (Positif si l'équipe gagnante était plus faible)
    const eloDiff = loserElo - winnerElo; 

    // Etape 2 : Le déficit de Rôle (Positif si les perdants étaient sur leurs meilleurs postes et les gagnants sur leurs pires)
    const roleDiff = loserRoleStrength - winnerRoleStrength; 

    // Etape 3 : L'indice de surprise (Upset Score)
    const upsetScore = eloDiff + (roleDiff * 100);

    // Si le score de surprise dépasse 25
    if (upsetScore > 25) {
      let surpriseReason = "";
      if (roleDiff > 0.15) {
        surpriseReason = " (à un poste inhabituel !)";
      } else if (winnerScore - loserScore >= 3) {
        surpriseReason = " (victoire écrasante !)";
      }

      upsets.push({
        match,
        upsetScore,
        winnerTeam,
        loserTeam,
        winnerScore,
        loserScore,
        surpriseReason
      });
    }
  }

  // Trier par Indice de Surprise décroissant
  upsets.sort((a, b) => b.upsetScore - a.upsetScore);

  const topUpsets = upsets.slice(0, 3);
  if (topUpsets.length > 0) {
    const upsetsHtml = topUpsets.map((u, i) => {
      const wNames = u.winnerTeam.map(p => getDisplayName(p.playerId)).join(" & ");
      const lNames = u.loserTeam.map(p => getDisplayName(p.playerId)).join(" & ");
      return `<div style="margin-top:4px; font-size:0.9em; opacity:0.9;">
        #${i+1} : <b>${wNames}</b> bat ${lNames} (${u.winnerScore}-${u.loserScore}) <i style="font-size:0.85em; opacity:0.8;">${u.surpriseReason}</i>
      </div>`;
    }).join("");

    facts.push({
      icon: "🤯",
      text: `<strong style="display:block; margin-bottom:4px;">Les braquages du siècle (Algorithme ELO + Rôles) :</strong> ${upsetsHtml}`
    });
  }

  // L'humiliation surprise : Seulement en 1v1
  const topStomps = upsets.filter(u => u.loserScore === 0 && u.winnerTeam.length === 1 && u.loserTeam.length === 1).slice(0, 1);
  if (topStomps.length > 0) {
    const u = topStomps[0];
    const wNames = u.winnerTeam.map(p => getDisplayName(p.playerId)).join(" & ");
    const lNames = u.loserTeam.map(p => getDisplayName(p.playerId)).join(" & ");
    facts.push({
      icon: "🌪️",
      text: `<strong>L'humiliation (Duel 1v1) :</strong> Malgré de terribles statistiques pour ce match, ${wNames} a infligé un brutal ${u.winnerScore}-0 à ${lNames} !`
    });
  }

  const container = document.getElementById("factsContainer");
  container.innerHTML = facts.map(f => `
    <div class="fact-card">
      <span class="fact-icon">${f.icon}</span>
      <span class="fact-text">${f.text}</span>
    </div>
  `).join("");
}

// ─── MAIN RENDER ────────────────────────────────────────────
function renderAllStatistics() {
  renderAttackDefense();
  renderPersonalRecords();
  renderRankings();
  renderMatchups();
  renderBadges();
  renderFacts();
}