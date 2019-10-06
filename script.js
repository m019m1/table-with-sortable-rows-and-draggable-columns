// class Column for moments of drag
class Column {
	constructor(index, ths, rows) {
		this.createElem(index, ths, rows);
	}
	createElem(index, ths, rows) {
		this._elem = document.createElement('table');
		let str = `<tr>${ths[index].outerHTML}</tr>`;
		for(let row of rows) str += `<tr>${row.cells[index].outerHTML}</tr>`;
		this._elem.insertAdjacentHTML('afterbegin', str);
		this._elem.classList.add('column');
		this._elem.style.left = `${ths[index].getBoundingClientRect().left + pageXOffset}px`;
		this._elem.style.top = `${ths[index].getBoundingClientRect().top + pageYOffset}px`;
		document.body.append(this._elem);
	}
	get elem() {
		return this._elem;
	}
	get centerX() {
		return (this._elem.getBoundingClientRect().left + this._elem.getBoundingClientRect().right) / 2 + pageXOffset;
	}
}

class TableWithSortAndDrag {
	constructor(selector) {
		this.table = document.querySelector(selector);
		this.tbody = this.table.querySelector('tbody');
		this.rows = Array.from(this.tbody.rows);
		this.ths = Array.from(this.table.querySelectorAll('th'));
		for(let th of this.ths) th.classList.add('unsort');
		this.getListeners();
	}

	getListeners() {
		this.table.addEventListener('mousedown', init.bind(this));
		this.table.addEventListener('touchstart', init.bind(this));
		
		function init() {
			const target = event.target.closest('th');

			const initClientX = (event.type == 'touchstart' ? event.touches[0].clientX : event.clientX);
			const initClientY = (event.type == 'touchstart' ? event.touches[0].clientY : event.clientY);
						
			if(!target) return;
			if(event.type == 'mousedown') event.preventDefault();

			let index = target.cellIndex;

			
			const shiftX = initClientX - target.getBoundingClientRect().left;
			const shiftY = initClientY - target.getBoundingClientRect().top;
			const left = this.table.getBoundingClientRect().left;

			let column, columns = [], newColumns = [];
			const self = this;
			const ths = this.ths;
			const rows = this.rows;
			let centers = [];

			document.addEventListener('mousemove', startMoving);
			document.addEventListener('touchmove', startMoving);
			
			// preparatory function 
			function startMoving() {
				const deltaX = (event.type == 'touchmove' ? Math.abs(event.touches[0].clientX - initClientX) : Math.abs(event.clientX - initClientX));
				const deltaY = (event.type == 'touchmove' ? Math.abs(event.touches[0].clientY - initClientY) : Math.abs(event.clientY - initClientY));
				
				// take 3pxs' shift for start in order to disregard situations when user want to sort,
				// but mouse accidentally move to 1-2 pxs
				if( deltaX > 3 || deltaY > 3 ) {
					splitTableToColumns(index);
					document.removeEventListener('mousemove', startMoving);
					document.removeEventListener('touchmove', startMoving);
					document.addEventListener('mousemove', onPointerMove);
					document.addEventListener('touchmove', onPointerMove);
				}
			}

			function splitTableToColumns(index) {
				for(let i = 0; i < ths.length; i++) {
					columns.push( new Column(i, ths, rows) );
				}
				column = columns[index];
				column.elem.classList.add('draggable');

				self.table.style.display = 'none';
				// get absolute positions of columns' centers for monitoring position of draggable column
				centers = columns.map((column) => column.centerX);
				newColumns = columns;
			}
	
			function onPointerMove() {
				const pageX = (event.type == 'touchmove' ? event.touches[0].pageX : event.pageX);
				const pageY = (event.type == 'touchmove' ? event.touches[0].pageY : event.pageY);
				moveAt(column.elem, pageX, pageY);

				const position = checkPosition(pageX);
				if(position == index || position == index + 1) return;	
				moveColumns(position);
			}

			function moveAt(el, pageX, pageY){
				el.style.left = `${pageX - shiftX}px`;
				el.style.top = `${pageY - shiftY}px`;
			}

			function checkPosition(pageX) {
				let i;
				for(i = 0; i < centers.length; i++) {
					if(pageX < centers[i]) {
						return i;
					}
				}
				return i;
			}
			
			function moveColumns(position) {
				// create new sequence of columns
				if(index < position) {
					newColumns.splice(position - 1, 0, newColumns.splice(index, 1)[0]);
				} else newColumns.splice(position, 0, newColumns.splice(index, 1)[0]);
					
				// define and assign new positions
				let frontier = left;
				newColumns.forEach((col, i) => {
					// cross-browser defining of border's width
					let borderWidth = Math.max( +parseInt(getComputedStyle(col.elem).borderLeft + 0), 1);

					if(i == position) {
						frontier = frontier + parseInt(getComputedStyle(col.elem).width) + borderWidth;
					} else {
							col.elem.style.left = `${frontier + pageXOffset - borderWidth}px`;
							frontier = col.elem.getBoundingClientRect().right;
						}
				});
				// redefine centers
				centers = newColumns.map((column) => column.centerX);
				if(index < position) {
					index = Math.max(position - 1, 0);
				} else index = position;
			}

			document.addEventListener('mouseup', finishDrag);
			document.addEventListener('touchend', finishDrag);
			
			function finishDrag() {
				document.removeEventListener('mousemove', startMoving);
				document.removeEventListener('touchmove', startMoving);
				document.removeEventListener('mousemove', onPointerMove);
				document.removeEventListener('touchmove', onPointerMove);
				document.removeEventListener('mouseup', finishDrag);
				document.removeEventListener('touchend', finishDrag);
				if(!document.querySelector('.draggable')) return;
				fillTable(newColumns);
				for(let col of newColumns) col.elem.remove();
			}

			function fillTable(columns) {
				for(let i = 0; i < ths.length; i++) {
					ths[i].outerHTML = columns[i].elem.rows[0].cells[0].outerHTML;
					for(let j = 0; j < rows.length; j++) {
						rows[j].cells[i].outerHTML = columns[i].elem.rows[j + 1].cells[0].outerHTML;
					}
				}
				self.table.style.display = '';
				
				// it's need to reassign table's properties for other operations
				self.ths = Array.from(self.table.querySelectorAll('th'));
				self.rows = Array.from(self.tbody.rows);
			}
			
		}

		this.table.addEventListener('click', this.sortAndRender.bind(this));

	}

	sortAndRender() {
		const target = event.target.closest('th');
		if(!target) return;

		const index = target.cellIndex;
		fixSizes.call(this, index); // cause content "::before" of headers can change width

		// sort and change arrows in content "::before"
		if(target.classList.contains("unsort")) {
			this.rows = sort(index, this.rows);
			for(let th of this.ths) {
				th.classList.remove('up');
				th.classList.remove('down');
				th.classList.add('unsort');
			}
			target.classList.add('up');
		} else if(target.classList.contains("up")) {
			this.rows = this.rows.reverse();
			target.classList.remove('up');
			target.classList.add('down');
		} else if(target.classList.contains("down")) {
			this.rows = this.rows.reverse();
			target.classList.remove('down');
			target.classList.add('up');
		}
		target.classList.remove('unsort');

		render(this.tbody, this.rows);

		// it's need to reassign rows for other operations
		this.rows = Array.from(this.tbody.rows);

		function sort(i, rows) {
			// sorting by comparison one-time received values is faster then sorting by comparison innerHTMLs
			// so first of all it's need to make new array
			const arr = [];	
			for(let row of rows) {
				const arr2 = [];
				for(let cell of row.cells) {
					arr2.push(cell.innerHTML);
				}
				arr2.push(row);
				arr.push(arr2);
			}
			
			arr.sort((a,b) => {
				if(+a[i] && +b[i]) return +a[i] - +b[i]; // numbers
				return a[i] > b[i] ? 1 : -1;	// strings
			});

			return arr.map(item => item[item.length - 1]); // return rows as DOM-elements
		}
		
		function render(tbody, rows) {
		// generate table via innerHTML, cause it's faster then DOM-remove/paste
		tbody.innerHTML = '';
		let str = '';
		for(let row of rows) {
			str += row.outerHTML;
		}
		tbody.innerHTML = str;
	}

		function fixSizes(index) {
			this.ths[index].style.width = getComputedStyle(this.ths[index]).width;
			this.ths[index].style.height = getComputedStyle(this.ths[index]).height;
			for(let row of this.rows) {
				row.cells[index].style.height = getComputedStyle(row.cells[index]).height;
			}
		}

	}
}

let table1 = new TableWithSortAndDrag('#grid');