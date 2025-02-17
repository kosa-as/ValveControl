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

class Help extends Viz {
  constructor(data) {
    super(data); // [item]
  }

  initViz() {
    let sections = [];
    this.data.forEach(item => {
      if (item[0] == '') {
        sections.push(item);
        sections.push(['','']);
      } else {
        let section = sections[sections.length-1];
        let nrleft = item[0].split('\n').length;
        let nrright = item[1].split('\n').length;
        for (let l = nrleft; l < nrright; l++) item[0] = item[0] + '\n';
        for (let r = nrright; r < nrleft; r++) item[1] = item[1] + '\n';
        section[0] = (section[0] == '') ? item[0] : section[0] + '\n' + item[0];
        section[1] = (section[1] == '') ? item[1] : section[1] + '\n' + item[1];
      }
    });

    let rows = sections.map(item => {
      if (item[0] == '') {
        let header = new Text(item[1]);
        header.bold = true;
        header.refreshMe(); // always needed after font changes!
        let dummy = new Text('');
        return [header, dummy];
      } else {
        let left = new Text(item[0]);
        let right = new Text(item[1]);
        return [left, right];
      }
    });

    this.table = new Table(rows);
    let box = new RoundedBoundingBox(this.table);
    box.setPadding(0);
    box.round = 10;
    box.color = '#FFFFFF';
    this.setViz(box);
  }
}
