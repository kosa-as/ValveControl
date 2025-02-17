/*
 * Copyright (C) 2020, 2021, 2022, 2023 Rob Wieringa <rma.wieringa@gmail.com>
 * Copyright (C) 2021 Jan (janneke) Nieuwenhuizen <janneke@gnu.org>
 * Copyright (C) 2022 Paul Hoogendijk <paul@dezyne.org>
 *
 * This file is part of Dezyne-P5.
 * Dezyne-P5 offers Dezyne web views based on p5.js
 *
 * Dezyne-P5 is free software, it is distributed under the terms of
 * the GNU General Public Licence version 3 or later.
 * See <http://www.gnu.org/licenses/>.
 */

let globals = {
  spacing: 100, // minimal spacing between lifelines
  hpadding: 5, // horizontal padding for HeaderGroup
  hsep: 15, // minimal horzontal separation between HeaderGroup elements
  vpadding: 5, // vertical padding for HeaderGroup
  barwidth: 10,
  verticalPerTime: 25,
  verticalStart: 25
};

class Header extends Viz {
  constructor(data) {
    super(data); // {instance, role, states, lifeline}
    this.instance = data.instance;
    this.role = data.role;
    this.states = data.states;
    this.stateEntry = null;
    this.lifeline = data.lifeline;
  }

  initViz() {
    let color =
        (this.role == 'component'
         || this.role == 'interface') ? '#AEE8A0' : '#FFFC80';

    let text = this.instance.replace(/.*\./,'');
    let btext = new Text(text);
    btext.bold = true;
    btext.refreshMe(); // always needed after font changes!
    let rows = [[btext]]; // one rows, one column
    if (this.states && this.states.length > 0) {
      let index = this.lifeline.index;
      let w = this.calcDimensions(index);
      let stateEntry = this.states[0].find(entry => entry.index == index);
      if (stateEntry && w.nrLines > 0) {
        // init table with empty text, but take nrLines into account
        let text = this.emptyLines(w.nrLines);
        let names = new Text(text);
        let values = new Text(text);
        names.setWidth(w.namesWidth);
        values.setWidth(w.valuesWidth);
        this.stateTable = new Table([[names, values]]); // one row, two columns
        this.stateTable.hpad = 0;
        this.stateTable.vpad = 0;
        this.stateTable.refreshMe();
        rows.push([this.stateTable]); // two rows, one column
      }
      else {
        this.stateTable = new Table([]);
      }
    }
    this.table = new Table(rows);
    this.table.centered = true;
    this.table.refreshMe();
    let box = new RoundedBoundingBox(this.table);
    box.setPadding(0);
    box.round = 10;
    box.color = color;
    // take care: eliblibles can be wider than Header!
    // add an 'invisible' (transparent) box as wide as the eligibles.
    let etext = this.lifeline.eligibles.map(eligible => eligible.displayText).join('\n');
    let eText = new Text(etext);
    let ewidth = eText.bounds.width;
    let ebox = new Box();
    ebox.bounds.width = ewidth;
    ebox.bounds.height = 1;
    ebox.color = '#FFFFFF00';
    ebox.strokeWeight = 0;
    ebox.refreshMe();
    let frame = new Frame([ebox, box]);
    // center the table in the frame
    box.hCenter(ewidth/2);
    this.setViz(frame);
  }

  calcDimensions(index) {
    let result = {namesWidth: 0, valuesWidth: 0, nrLines: 0};
    let allNames = '';
    let allValues = '';
    this.states.forEach(state => {
      let stateEntry = state.find(entry => entry.index == index);
      if (stateEntry) {
        result.nrLines = Math.max(result.nrLines, stateEntry.state.length);
        allNames += '\n'+stateEntry.state.map(entry => entry.name).join('\n');
        allValues += '\n'+stateEntry.state.map(entry => entry.value).join('\n');
      }
    });
    let text = new Text(allNames);
    result.namesWidth = text.bounds.width;
    text = new Text(allValues);
    result.valuesWidth = text.bounds.width;
    return result;
  }

  emptyLines(nr) {
    let text = '';
    for (let i = 2; i <= nr; i++) {
      text = text + '\n';
    }
    return text;
  }

  refreshMe() {
    if (this.stateEntry && this.stateEntry.length) {
      // cope with changes in stateEntry
      let names = this.stateEntry.map(entry => entry.name).join('\n');
      let values = this.stateEntry.map(entry => entry.value).join('\n');
      let content = this.stateTable.content[0];
      content[0].text = names;
      content[0].refreshMe();
      content[1].text = values;
      content[1].refreshMe();
      this.stateTable.refreshMe();
    }
    this.table.refreshMe();
    this.viz.refreshMe();
  }

  get midOffset() {
    return this.bounds.width/2;
  }

  set state(stateEntry) {
    if (stateEntry) {
      this.stateEntry = stateEntry;
      this.refreshMe();
    }
  }

  highlight(on) {
    this.viz.content[1].highlight(on);
  }
}

class HeaderGroup extends Viz {
  constructor(data) {
    super(data); // {name, elements, foreign, lifelineGroup, states}
    this.name = data.name;
    this.elements = this.lifelinesToHeaders(data.elements);
    this.lifelineGroup = data.lifelineGroup;
    this.states = data.states;
    this.foreign = data.foreign;
  }

  lifelinesToHeaders(elements) {
    return elements.map(element => element instanceof Lifeline ? element.header : element.header);
  }

  get firstHeader() {
    let frst = this.elements[0];
    return frst instanceof Header ? frst : frst.firstHeader;
  }

  get lastHeader() {
    let lst = this.elements[this.elements.length-1];
    return lst instanceof Header ? lst : lst.lastHeader;
  }

  get firstDepth() {
    let frst = this.elements[0];
    return frst instanceof Header ? 1 : frst.firstDepth + 1;
  }

  get maxDepth() {
    let max = 0;
    this.elements.forEach(element => {
      let d = element instanceof HeaderGroup ? element.maxDepth : 0;
      max = Math.max(max, d);
    });
    return max + 1;
  }

  initVizLight(light) {
    //let text = this.text.replaceAll(/\./g,'.\n');
    let text = this.name.replace(/.*\./,'');

    let name = new Text(text);
    this.elements.forEach(element => {
      if (element instanceof HeaderGroup)
        element.initVizLight(!light);
      else
        element.initViz();
    });
    let eframe = new Frame(this.elements);
    let frame = new Frame([name, eframe]);
    let bbox = new BoundingBox(frame)
    bbox.setPadding(globals.hpadding);
    bbox.color = this.foreign ? '#E5FFE5' : light ? '#C9FFC9' : '#C0F7BC';
    bbox.shadowed = false;
    bbox.strokeWeight = .1;
    if (this.name == '') {
      bbox.color = '#FFFFFF';
      bbox.shadowed = false;
      bbox.strokeWeight = 0;
    }
    this.setViz(bbox);
    this.refreshMe();
  }

  refreshMe() {
    let bbox = this.viz;
    let frame = bbox.content;
    let name = frame.content[0];
    let eframe = frame.content[1];
    this.elements.forEach((element, ei) => {
      if (ei == 0) {
        element.move(globals.hpadding, 0);
      } else {
        let prevElement = this.elements[ei-1];
        let prevHeader = prevElement instanceof Header ? prevElement : prevElement.lastHeader;
        let nextHeader = element instanceof Header ? element : element.firstHeader;
        let prevmid = prevHeader.relativeBounds(eframe).x + prevHeader.bounds.width/2;
        let relnextmid = nextHeader.relativeBounds(element.viz).x + nextHeader.bounds.width/2;
        // 1) distance prevElement and element must be at least globals.hsep
        // 2) mids distance of prevHeader and nextHeader must be at least globals.spacing
        let px1 = prevElement.bounds.x + prevElement.bounds.width + globals.hsep;
        let px2 = prevmid + globals.spacing - relnextmid;
        element.move(Math.max(px1, px2), 0);
        if (element instanceof HeaderGroup) {
          let maxd = element.maxDepth;
          element.shift(0, - maxd*(globals.vpadding*2 + name.bounds.height));
        }
      }
    });
    eframe.refreshMe();
    name.hCenter(eframe.bounds.width/2);
    eframe.move(0, name.bounds.height + globals.vpadding);
    frame.refreshMe();
    bbox.refreshMe();
  }

  get midOffset() {
    let frst = this.elements[0];
    return frst.midOffset + globals.hpadding;
  }

  reorder(header) {
    let local = this.elements.find(element => element == header);
    if (local) {
      let overlaps = function(elt1, elt2) {
        return !(elt1.bounds.x + elt1.bounds.width < elt2.bounds.x
                 || elt2.bounds.x + elt2.bounds.width < elt1.bounds.x);
      }
      let swap = function(elt1, elt2) {
        let swapped = [];
        this.elements.forEach(element => {
          if (element == elt1) swapped.push(elt2);
          else if (element == elt2) swapped.push(elt1);
          else swapped.push(element);
        });
        return swapped;
      }.bind(this);
      let reordered;
      let hi = this.elements.findIndex(element => element == header);
      let hmid = header.bounds.x + header.bounds.width/2;
      this.elements.forEach((element, ei) => {
        if (element != header && element.role == header.role) {
          if (overlaps(element, header)) {
            let emid = element.bounds.x + element.bounds.width/2;
            if ((hi < ei && hmid > emid) || (hi > ei && hmid < emid)) {
              reordered = swap(element, header);
            }
          }
        }
      });
      if (reordered) {
        this.elements = reordered;
        let hx = header.bounds.x;
        this.refreshMe();
        header.bounds.x = hx;
        this.elements.forEach(element => {
          if (element.role == 'provides' || element.role == 'requires') {
            element.lifeline.align();
          }
        });
      }
    } else {
      this.elements.forEach(element => {
        if (element instanceof HeaderGroup) element.reorder(header);
      });
    }
  }

  get lifelineOrder() {
    return this.elements.map(element =>
      (element instanceof Header ? element.lifeline.index : element.lifelineOrder));
  }

  restoreLifelineOrder(lifelineOrder) {
    this.elements = this.elements.map((element, ei) => {
      let elt;
      if (element instanceof Header) {
        let ll = lifelineOrder[ei];
        elt = this.elements.find(element => (element instanceof Header && element.lifeline.index == ll));
      } else {
        element.restoreLifelineOrder(lifelineOrder[ei]);
        elt = element;
      }
      return elt;
    });
  }
}

class Activity extends Viz {
  constructor(data) {
    super(data); // {key, time, location, lifeline}
    this.key = data.key;
    this.time = data.time;
    this.location = data.location;
    this.lifeline = data.lifeline;
  }

  initViz() {
    this.setViz(new Dot());
  }

  draw(p) {
    // do not show
  }
}

class AnyBar extends Viz {
  constructor(data) {
    super(data); // {startTime, endTime, lifeline}
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.lifeline = data.lifeline;
  }

  initViz() {
    this.bar = new Box();
    this.bar.bounds.width = globals.barwidth;
    this.barExtend = 4;
    this.bar.bounds.height = this.timeToY(this.endTime) - this.timeToY(this.startTime) + 2*this.barExtend;
    this.bar.color = '#000000';
    this.setViz(this.bar);
  }

  timeToY(t) {
    return globals.verticalStart + t * globals.verticalPerTime - this.barExtend + 17; // TODO: why 17?
  }
}

class BlockedBar extends AnyBar {
  constructor(data) {
    super(data); // {startTime, endTime, lifeline}
  }

  initViz() {
    super.initViz();
    this.bar.color = '#DDDDDD';
    this.refreshMe();
  }
}

class ActivityBar extends AnyBar {
  constructor(data) {
    super(data); // {startTime, endTime, blocked, lifeline}
    this.blocked = data.blocked.map(bl => new BlockedBar({...bl, lifeline: data.lifeline}));
  }

  initViz() {
    super.initViz();
    this.bar.color = '#FE938C';
    this.blocked.forEach(bl => {
      bl.initViz();
      // relative positioning:
      bl.move(0, (bl.startTime - this.startTime)*globals.verticalPerTime);
    });
    let frame = new Frame([this.bar].concat(this.blocked));
    this.setViz(frame);
  }
}

class Eligible extends Viz {
  constructor(data) {
    super(data); // {text, type, illegal}
    this.text = data.text;
    //this.displayText = this.text.replaceAll(/\./g,'.\n');
    this.displayText = this.text.replace(/.*\./,'');
    this.type = data.type;
    this.illegal = data.illegal;
  }

  initViz() {
    this.button = new Button(this.displayText, this.buttonHandleEligible, this);
    this.button.color = this.illegal ? '#EEEEEE'
      : this.displayText == '<back>' ? '#5BC0EB' // '#6FFFE9'
      : '#B9E5F7';
    this.button.strokeWeight = 1;
    this.button.strokeColor = this.illegal ? '#CCCCCC' : '#888888';
    this.button.setPadding(4);

    this.setViz(this.button); // TODO
  }

  draw(p) {
    this.viz.draw(p);
  }

  buttonHandleEligible() {
    // take care: this instanceof Button
    this.manager.handleEligible()
  }

  handleEligible() {
    console.log('PRESSED ' + this.text);
  }

}

class Message extends Viz {
  constructor(data) {
    super(data); // {text, location}
    this.text = data.text;
    this.location = data.location;
    this.type = this.text.startsWith('error') ? 'error' :
      this.text.startsWith('warning') ? 'warning' :
      this.text.startsWith('info') ? 'info' :
      'unknown';
  }

  initViz() {
    this.button = new Button(this.text, this.messageHandle, this);
    this.button.color =
      this.type == 'error' ? '#FD9A99' :
      this.type == 'warning' ? '#FFDDA2' :
      this.type == 'info' ? '#D6E8A0' :
      '#FFFFFF';
    this.button.strokeWeight = 1;
    this.button.strokeColor = '#888888';
    this.button.setPadding(4);

    this.setViz(this.button);
  }

  draw(p) {
    this.viz.draw(p);
  }

  messageHandle() {
    // take care: this instanceof Button
    return this.manager.handleMessage()
  }

  handleMessage() {
    console.log('PRESSED ' + this.text);
    return this.location;
  }
}

class Lifeline extends Viz {
  constructor(data) {
    super(data); // {index, length, header, activities, labels, states, bars, group}
    this.index = data.index;
    this.header = new Header({...data.header, states: data.states, lifeline: this});
    this.activities = this.data.activities.map(activity => new Activity({...activity, lifeline: this}));
    this.bars = this.data.bars.map(bar => new ActivityBar({...bar, lifeline: this}));
    this.group = data.group; // surrounding LifelineGroup
    this.eligibles =
        this.data.labels.filter(label => !label.illegal)
        .concat(this.data.labels.filter(label => label.illegal))
        .map(eligible => new Eligible(eligible));
  }

  initViz() {
    let len = globals.verticalStart + this.data.length*globals.verticalPerTime;
    let line = new VLine(len);
    line.color = '#888888';
    // header is done separately!

    this.activities.forEach(activity => {
      activity.initViz();
    });

    this.bars.forEach(bar => {
      bar.initViz();
    });

    this.eligibles.forEach((eligible,i) => {
      eligible.initViz();
    });
    let frame = new Frame([line].concat(this.activities, this.bars, this.eligibles));
    this.setViz(frame);
    this.refreshMe();
  }

  refreshMe() {
    let eligibleVertical = 30;
    let len = this.viz.content[0].bounds.height;
    this.activities.forEach(activity => {
      activity.move(0, globals.verticalStart + activity.time*globals.verticalPerTime);
    });
    this.bars.forEach(bar => {
      bar.move(-bar.bounds.width/2, bar.timeToY(bar.startTime));
    });
    this.eligibles.forEach((eligible,i) => {
      eligible.move(0, len + i*eligibleVertical);
      eligible.hCenter(0);
    });
    this.viz.refreshMe();
  }

  align() {
    // mid aligns with header; use absolute coordinates
    let parentbnd = this.viz.parent ? this.viz.parent.absoluteBounds : { x: 0 };
    let headermid = this.header.absoluteBounds.x + this.header.midOffset;
    this.move(headermid - (parentbnd.x + this.midOffset), 0);
  }

  get midOffset() {
    return this.bounds.width/2;
  }

  get headerOffset() {
    return this.header.midOffset - this.midOffset;
  }

  findActivity(key) {
    return this.activities.find(activity => activity.key == key);
  }

  set state(stateEntry) {
    if (stateEntry)
      this.header.state = stateEntry;
  }

  highlight(on) {
    this.viz.content[0].highlight(on);
  }
}

class LifelineGroup extends Viz {
  constructor(data) {
    super(data); // {name, lifelines, states, group}
    this.name = data.name;
    this.states = data.states;
    this.group = data.group; // surrounding LifelineGroup
    this.elements = this.partition(data.lifelines);
    this.foreign = this.isForeign(this.elements);
    if (this.foreign) {
      this.elements = this.elements.filter(element =>
        !(element.header instanceof Header && element.header.role == 'foreign'));
    }
    this.header = new HeaderGroup({name: this.name, elements: this.elements,
                                   foreign: this.foreign,
                                   lifelineGroup: this, states: this.states});
  }

  isForeign(elements) {
    return elements.find(element =>
        element.header instanceof Header && element.header.role == 'foreign') != null;
  }

  partition(lifelines) {
    let prefix = function(ll) {
      let str = ll.header.instance;
      str = (this.name == '') ? str : str.replace(this.name + '.', '');
      return str.replace(/\..*/,'');
    }.bind(this);
    // step1:
    let groups = [];
    let group = null;
    lifelines.forEach(ll => {
      if (group) {
        if (prefix(group[0]) == prefix(ll)) {
          group.push(ll);
        } else {
          groups.push(group);
          group = [ll];
        }
      } else {
        group = [ll];
      }
    });
    if (group) {
      groups.push(group);
    }

    let elements = groups.map(group => {
      if (group.length == 1) {
        let lldata = group[0];
        return new Lifeline({...lldata, states: this.states, group: this});
      } else {
        let p = prefix(group[0]);
        let name = (this.name == '') ? p : this.name + '.' + p;
        return new LifelineGroup({name: name, lifelines: group, states: this.states, group: this});
      }
    });
    return elements;
  }

  initViz() {
    this.elements.forEach(element => element.initViz());
    let frame = new Frame(this.elements);
    this.setViz(frame);
    this.align();
  }

  align() {
    this.elements.forEach(element => element.align());
    this.viz.refreshMe();
  }

  get midOffset() {
    let frst = this.elements[0];
    return frst.midOffset;
  }

  get headerOffset() {
    return this.header.midOffset - this.midOffset;
  }

  get firstLifeline() {
    let frst = this.elements[0];
    return frst instanceof Lifeline ? frst : frst.firstLifeline;
  }

  findActivity(key) {
    return this.elements
      .map(element => element.findActivity(key))
      .find(act => act != null);
  }

  findLifeline(index) {
    return this.elements
      .map(element => {
        if (element instanceof Lifeline) {
          return (element.index == index) ? element : null;
        } else {
          return element.findLifeline(index);
        }
      })
      .find(ll => ll != null);
  }

  getComponentLifelines() {
    return this.elements
      .map(element => {
        if (element instanceof Lifeline) {
          return (element.header.role == "component") ? element : null;
        } else {
          return element.getComponentLifelines();
        }
      })
      .filter(ll => ll != null);
  }

  set state(state) {
    if (state) {
      this.elements.forEach(element => {
        if (element instanceof Lifeline) {
          let entry = state.find(st => st.index == element.index);
          if (entry)
            element.state = entry.state;
        } else {
          element.state = state;
        }
      });
    }
  }
}

class Event extends Viz {
  constructor(data, body) {
    super(data); // {text, from, to, type, index}
    this.body = body;
    this.from = body.findActivity(this.data.from);
    this.to = body.findActivity(this.data.to);
    this.type = data.type;
    this.index = data.index;
    if (this.type == 'error') {
      this.messages = this.data.messages.map(msg => new Message(msg));
    }
  }

  initViz() {
    let content = [];
    if (this.type != 'error') {
      let arrow = new HArrow(0, 0, 0);
      if (this.type == 'return') arrow.color = '#888888';
      let text = new Text(this.data.text);
      content = content.concat([arrow, text]);
    } else {
      let img = new Alert();
      content = content.concat([img]);
      this.messages.forEach(msg => msg.initViz());
      content = content.concat(this.messages);
    }
    let frame = new Frame(content); // (0,0) located
    this.setViz(frame);
    this.refreshMe();
  }

  refreshMe() {
    let frame = this.viz;

    let fromBounds = this.from.relativeBounds(this.body.viz);
    let toBounds = this.to ? this.to.relativeBounds(this.body.viz) : {x: fromBounds.x + 100};
    let height = fromBounds.y;

    // compensate for activity bar with:
    let left;
    if (fromBounds.x == toBounds.x) {
      left = toBounds.x + globals.barwidth/2;
    } else if (fromBounds.x < toBounds.x) {
      left = fromBounds.x + globals.barwidth/2;
    } else {
      left = toBounds.x + globals.barwidth/2;
    }
    if (this.type != 'error') {
      let arrow = frame.content[0];
      let text = frame.content[1];

      // compensate for activity bar with:
      if (fromBounds.x == toBounds.x) {
        arrow.update(20, 0, 0);
      } else if (fromBounds.x < toBounds.x) {
        arrow.update(0, toBounds.x-fromBounds.x-globals.barwidth, 0);
      } else {
        arrow.update(fromBounds.x-toBounds.x-globals.barwidth, 0, 0);
      }
      text.refresh();
      if (fromBounds.x == toBounds.x) text.move(0, 0);
      else text.hCenter((fromBounds.x+toBounds.x)/2-left);
      text.move(text.bounds.x, -(text.bounds.height+2));
      frame.refreshMe();
      frame.move(left, height);
      if (fromBounds.x != toBounds.x) frame.hCenter((fromBounds.x+toBounds.x)/2);
    } else {
      let img = frame.content[0];
      this.messages.forEach((msg, i) => {
        msg.move(img.bounds.x+img.bounds.width+15,i*(msg.bounds.height+2));
      });
      frame.refreshMe();
      frame.move(left, height);
      frame.hCenter((fromBounds.x+toBounds.x)/2);
    }
  }

  highlight(on) {
    this.viz.content[0].highlight(on);
  }

}

class Body extends Viz {
  constructor(data) {
    super(data); // {lifelines, events, states}
    // add first state to lifelines
    this.lifelineGroup = new LifelineGroup({name: '', lifelines: this.data.lifelines, states: this.data.states, group: null});
    this.events = this.data.events.map(d => new Event(d, this)); // need global info!
    this.header = this.lifelineGroup.header;
  }

  initViz() {
    this.lifelineGroup.initViz();
    this.events.forEach(event => event.initViz());
    let body = new Frame([this.lifelineGroup].concat(this.events));
    this.setViz(body);
    this.refreshMe();
  }

  refreshMe() {
    this.move(this.headerOffset, this.header.bounds.height);
  }

  refreshEvents() {
    this.events.forEach(event => event.refreshMe());
  }

  get headerOffset() {
    return this.lifelineGroup.headerOffset;
  }

  align() {
    this.lifelineGroup.align();
    this.events.forEach(event => event.refreshMe());
    this.viz.refresh();
  }

  findActivity(key) {
    return this.lifelineGroup.findActivity(key);
  }

  findLifeline(index) {
    return this.lifelineGroup.findLifeline(index);
  }

  getComponentLifelines() {
    return this.lifelineGroup.getComponentLifelines();
  }

  set state(state) {
    if (state)
      this.lifelineGroup.state = state;
  }

  reorder(header) {
    this.header.reorder(header);
    this.refreshEvents();
  }

  restoreLifelineOrder(lifelineOrder) {
    this.header.restoreLifelineOrder(lifelineOrder);
  }
}

class SequenceDiagram extends Viz {
  constructor(data) {
    super(data); // {lifelines, events, states}
    // restore lifeline index field:
    data.lifelines.forEach( (ll,index) => ll.index = index);
    // restore lifeline length field:
    let maxTime = 0;
    data.lifelines.forEach( ll => {
      ll.activities.forEach(act => maxTime = Math.max(maxTime, act.time));
    });
    maxTime += 1;
    // compensate lifeline length for error event:
    if (data.events && data.events.length > 0 && data.events[data.events.length-1].type == 'error') {
      maxTime += 2; // TODO: is 2 ok?
    }
    data.lifelines.forEach(ll => ll.length = maxTime+1);
    // add index to events:
    data.events.forEach( (event, index) => event.index = index);
    // add lifeline index to states:
    if (data.states) {
      data.states.forEach(state => {
        state.forEach(stateEntry => {
          let ll = data.lifelines.find(ll => ll.header.instance == stateEntry.instance);
          stateEntry.index = ll ? ll.index : 0;
        });
      });
    }
    // add activity bars:
    addBars(data);

    this.body = new Body(data);
    this.header = this.body.header;
    this.states = data.states;
  }

  initViz() {
    this.header.initVizLight(false);
    this.body.initViz();
    this.body.align();
    this.setViz(new Frame([this.body, this.header]));
    this.move(0, 0);
  }

  findActivity(key) {
    return this.body.findActivity(key);
  }

  setActive(stateIndex) {
    if (this.states && stateIndex < this.states.length)
      this.body.state = this.states[stateIndex];
  }

  get lifelineOrder() {
    return this.body.header.lifelineOrder;
  }

  restoreLifelineOrder(lifelineOrder) {
    this.body.restoreLifelineOrder(lifelineOrder);
  }
}
