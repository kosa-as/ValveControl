/*
 * Copyright (C) 2021 Rob Wieringa <rma.wieringa@gmail.com>
 *
 * This file is part of Dezyne-P5.
 * Dezyne-P5 offers Dezyne web views based on p5.js
 *
 * Dezyne-P5 is free software, it is distributed under the terms of
 * the GNU General Public Licence version 3 or later.
 * See <http://www.gnu.org/licenses/>.
 */

function addBars(data) {

  function findActivity(lifeline, key) {
    return lifeline.activities.find(activity => activity.key == key);
  }

  function findLifeline(data, key) {
    return data.lifelines.find(lifeline => {
      let act = findActivity(lifeline, key);
      return act != null;
    });
  }

  function isOpen(bar) {
    return bar.endTime == -1;
  }

  function startBar(lifeline, time) {
    if (lifeline.bars.length == 0 || !isOpen(lifeline.bars[lifeline.bars.length-1])) {
      let bar = {startTime: time, endTime: -1, blocked: []};
      if (!bar) return;
      lifeline.bars.push(bar);
    }
  }

  function endBar(lifeline, time) {
    if (lifeline.bars.length == 0) return;
    let bar = lifeline.bars[lifeline.bars.length-1];
    if (!bar) return;
    if (bar.blocked.length > 0 && isOpen(bar.blocked[bar.blocked.length-1]))
        endBlocked(lifeline, time);
    bar.endTime = time;
  }

  function startBlocked(lifeline, time) {
    // pre: lifeline.bars.length > 0 && isOpen(lifeline.bars[lifeline.bars.length-1])
    let bar = lifeline.bars[lifeline.bars.length-1];
    if (!bar) return;
    let w = {startTime: time, endTime: -1};
    bar.blocked.push(w);
  }

  function endBlocked(lifeline, time) {
    if (lifeline.bars.length == 0) return;
    let bar = lifeline.bars[lifeline.bars.length-1];
    if (bar.blocked.length == 0) return;
      if (!bar) return;
    let w = bar.blocked[bar.blocked.length-1];
    w.endTime = time;
  }

  // init: add empty list of bars to each lifline:
  data.lifelines.forEach(lifeline => {
    lifeline.bars = [];
  });

  let activeLine = null;
  let lastTime = -1;
  data.events.forEach(event => {
    let lifelineFrom = findLifeline(data, event.from);
    let activityFrom = findActivity(lifelineFrom, event.from);
    // 'to' might be missing!
    let lifelineTo = findLifeline(data, event.to);
    let activityTo = lifelineTo && findActivity(lifelineTo, event.to);
    // close previous bar upon lifeline switch
    if (activeLine && activeLine.index != lifelineFrom.index) {
      endBar(activeLine, lastTime);
    }
    if (event.type == 'in') {
      if (lifelineFrom.header.role == 'provides') {
        startBar(lifelineFrom, activityFrom.time);
      }
      startBlocked(lifelineFrom, activityFrom.time);
      if (lifelineTo) {
        startBar(lifelineTo, activityTo.time);
        activeLine = lifelineTo;
        lastTime = activityTo.time;
      } else {
        activeLine = null;
      }
    } else if (event.type == 'return') {
      endBar(lifelineFrom, activityFrom.time);
      if (!lifelineTo) {
        activeLine = null;
        lastTime = -1;
      } else if (lifelineTo.header.role == 'provides') {
        endBar(lifelineTo, activityTo.time);
        activeLine = null;
        lastTime = -1;
      } else {
        endBlocked(lifelineTo, activityTo.time);
        activeLine = lifelineTo;
        lastTime = activityTo.time;
      }
    } else if (event.type == 'out') {
      if (!lifelineTo) {
        activeLine = null;
          lastTime = -1;
      } else if (lifelineFrom.index == lifelineTo.index) {
        // qout
        startBar(lifelineTo, activityTo.time);
        activeLine = lifelineTo;
        lastTime = lifelineTo ? activityTo.time : -1;
      } else {
        // either qin on lifelineTo or out on provides
        if (lifelineTo.header.role == 'component'
           || lifelineTo.header.role == 'interface') {
          // qin
          startBar(lifelineFrom, activityFrom.time);
          activeLine = lifelineFrom;
          lastTime = activityFrom.time;
        } else {
          // out to provides
          activeLine = lifelineFrom;
          lastTime = activityFrom.time;
        }
      }
    }
  });

  // finit: close all open bars:
  data.lifelines.forEach(lifeline => {
    if (lifeline.bars.length > 0 && isOpen(lifeline.bars[lifeline.bars.length-1])) {
      endBar(lifeline, lifeline.length-1)
    }
  });

/*
  // debug:
  data.lifelines.forEach(lifeline => {
    console.log('lifeline: ' + lifeline.header.text);
    lifeline.bars.forEach(bar => {
      console.log('  ' + bar.startTime + ' -> ' + bar.endTime);
    });
  });
*/
}
