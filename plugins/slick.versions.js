(function ($) {

  $.extend(true, window, {"Slick": {"Versions": Versions}});

  function Versions(fastGrid, grid, dataView) {
    var cookieId, _state = {
      toggled: null,
      ids: [],
      preserve: function() {
        var data = grid.getData().getItems();
        this.ids = [];
        switch (this.toggled) {
          case "expanded":
            this.toggled = "expanded";
          break;
          case "collapsed":
            this.toggled = "collapsed";
          break;
          default:
            this.ids = _.chain(data).where({__collapsed: false}).pluck("id").value();
            this.toggled = null;
        }
      },
      restore: function() {
          _.each(this.ids, function(id) {_toggle(dataView.getItemById(id))});this.ids = [];
      },
      isgroupped: function() {
        var data = grid.getData().getItems();
        if (data.length === 0) return false;
        return !_.has(data[0], "__children");
      },
      label: {
        "expanded": "Collapse Seq No",
        "collapsed": "Expand Seq No"
      }
    };
    function init() {
      grid.onSort.unsubscribe(fastGrid.onSort);
      grid.onSort.subscribe(onSort);
      grid.onClick.subscribe(onClick);
      fastGrid.onFetchRows.subscribe(onFetchRows);
      fastGrid.onGroupRows.subscribe(onGroupRows);
      fastGrid.onToggleRows.subscribe(onToggleRows);
      if (fastGrid.enableDragDrop) {
        fastGrid.dragZone.onAfterDragDrop.subscribe(onAfterDragDrop);
      }
    };
    init.call(this);
    function destroy() {
      grid.onSort.unsubscribe(onSort);
      grid.onClick.unsubscribe(onClick);
      fastGrid.onFetchRows.unsubscribe(onFetchRows);
      fastGrid.onGroupRows.unsubscribe(onGroupRows);
      fastGrid.onToggleRows.unsubscribe(onToggleRows);
      if (fastGrid.enableDragDrop) {
        fastGrid.dragZone.onAfterDragDrop.unsubscribe(onAfterDragDrop);
      }
    };
    function onSort(evt, args) {
      try {
        if (_.isUndefined(evt.stopImmediatePropagation)) return;
        evt.stopImmediatePropagation();
        var data = grid.getData(), rows = data.getItems();
        _state.preserve();
        dataView.beginUpdate();
        _collapseAll(rows);
        _sort(data, [{sortCol: {field: args.sortCol.field}, sortAsc: args.sortAsc}]);
        _state.restore();
        dataView.endUpdate();
        grid.render();
      } catch(e) {
        throw new Error("slick.versions: " + e.message);
      }
    };
    function onClick (evt, args) {
      if ($(evt.target).hasClass("bac-toggle")) {
        try {
          evt.stopImmediatePropagation();
          dataView.beginUpdate();
          _toggle(dataView.getItem(args.row));
          dataView.endUpdate();
        } catch(e) {
          throw new Error("slick.versions: " + e.message);
        }
      }
    };
    function onFetchRows(evt, data) {
      try {
        _state.preserve();
        dataView.beginUpdate();
        data = (dataView.getGroups().length === 0 && _state.toggled !== "expanded") ?_build(data):_flatten(data);
        dataView.setItems(data);
        _state.restore();
        dataView.endUpdate();
        evt.stopImmediatePropagation();
      } catch(e) {
        throw new Error("slick.versions: " + e.message);
      }
    };
    function onGroupRows(evt, args) {
      try {
        evt.stopImmediatePropagation();
        var data = grid.getData().getItems();
        switch (args.id) {
          case "_e_from_groupBy":
            if (_state.isgroupped()) return;
            dataView.beginUpdate();
            dataView.setItems(_flatten(data));
            dataView.endUpdate();
          break;
          case "_e_from_removeGroupBy":
            if (!_state.isgroupped()) return;
            dataView.beginUpdate();
            dataView.setItems(_build(data));
            dataView.endUpdate();
            dataView.reSort();
            grid.invalidateAllRows();
            grid.render();
        }
      } catch(e) {
          throw new Error("slick.versions: " + e.message);
      }
    };
    function onToggleRows(evt, args) {
      try {
        evt.stopImmediatePropagation();
        if (dataView.getGroups().length > 0) return;
        var data = grid.getData().getItems(),
        path = window.location.pathname.replace(/^\/([^\/]*).*$/, '$1'),
        expires = new Date(); expires.setTime(new Date().getTime() + 1000 * 60 * 60 * 24 * 30);
        _state.toggled = (_state.toggled === "expanded")?"collapsed":"expanded";
        Ext.getBody().mask();
        switch (_state.toggled) {
          case "expanded":
            dataView.beginUpdate();
            dataView.setItems(_flatten(data));
            dataView.endUpdate();
            grid.invalidateAllRows();
            grid.render();
            document.cookie = cookieId + '=expanded; expires=' + expires.toGMTString() + '; path=/' + path;
            break;
          case "collapsed":
            dataView.beginUpdate();
            dataView.setItems(_build(data));
            dataView.endUpdate();
            dataView.reSort();
            grid.invalidateAllRows();
            grid.render();
            document.cookie = cookieId + '=collapsed; expires=' + expires.toGMTString() + '; path=/' + path;
        }
      } catch(e) {
          throw new Error("slick.versions: " + e.message);
      } finally {
          Ext.getBody().unmask();
      }
    };
    function onAfterDragDrop(evt, data) {
     try {
        $(data.row.dom).find(".bac-toggle").removeClass('bac-toggle bac-expand bac-collapse');
        evt.stopImmediatePropagation();
      } catch(e) {
        throw new Error("slick.versions: " + e.message);
      }
    };
    function getItemMetadata(item, cssClasses) {
      if (_.isUndefined(item)) return null;
      if (!_.isUndefined(item.__child)) cssClasses.cssClasses += ' bac-grid-row-child';
      return cssClasses;
    };
    function _toggle(row) {
      if (_.isUndefined(row)) return;
      var inx = dataView.getIdxById(row.id) + 1;
      if (_.isUndefined(row.__collapsed)) return;
      row.__collapsed = !row.__collapsed;
      dataView.updateItem(row.id, row);
      if (row.__collapsed) {
        for(var i = 0; i < row.__children.length; i++) {
          var id = dataView.getItemByIdx(inx).id;
          dataView.deleteItem(id);
        };
      } else {
        for(var i = 0; i < row.__children.length; i++) {
          dataView.insertItem(i+inx, row.__children[i]);
        };
      }
    };
    function _sort(data, cols) {
      data.sort(function (dataRow1, dataRow2) {
        for (var i = 0, l = cols.length; i < l; i++) {
          var field = cols[i].sortCol.field,
          sign = cols[i].sortAsc ? 1 : -1,
          value1 = dataRow1.fields.map[field].convert(dataRow1[field]),
          value2 = dataRow2.fields.map[field].convert(dataRow2[field]),
          result = (value1 == value2 ? 0 : (value1 > value2 ? 1 : -1)) * sign;
          if (result != 0) {
            return result;
          }
        }
        return 0;
      });
    };
    function _build(data) {
      var parents = [], children = [];
      _sort(data, [{sortCol: {field: "DOC_TUPLE_ID"}, sortAsc: true},
          {sortCol: {field: "VERSION_NUMBER"}}]);
      var docTupleId = null;
      _.each(data, function(item){
        if (docTupleId !== item["DOC_TUPLE_ID"]) {
          docTupleId = item["DOC_TUPLE_ID"]; item.__collapsed = true; parents.push(item);
        } else {
          item.__children = []; item.__child = true; children.push(item);
        }
      }, this);
      _.each(parents, function(item){
        item.__children = _.where(children, {"DOC_TUPLE_ID": item["DOC_TUPLE_ID"]});
      }, this);
      children = null;
      return parents;
    };
    function _flatten(data) {
        _collapseAll(data);
        var _clean = function(item) {delete item.__children; delete item.__child; delete item.__collapsed;},
        children;
        _.each(data, function(item) {
          children = item.__children||[];
          _.each(children, function(child) {
            _clean(child); data.push(child);
          }); _clean(item);
        }); children = null; dataView.reSort();
        return data;
    };
    function _collapseAll(data) {
      data = data||grid.getData().getItems();
      _.chain(data).where({__collapsed: false}).each(function(row) {row.__collapsed = true});
      _.chain(data).where({__child: true}).pluck("id").each(function(id) {dataView.deleteItem(id)});
    };
    return {
      "init": init,
      "destroy": destroy,
      "onSort": onSort,
      "onClick": onClick,
      "onFetchRows": onFetchRows,
      "getItemMetadata": getItemMetadata
    };
  };
})(jQuery);