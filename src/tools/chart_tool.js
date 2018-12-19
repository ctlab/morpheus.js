/**
 * @param chartOptions.heatmap phantasus.HeatMap
 * @param chartOptions.project
 *            phantasus.Project
 */
phantasus.ChartTool = function (chartOptions) {
  var _this = this;
  this.project = chartOptions.project;
  this.heatmap = chartOptions.heatmap;
  var project = this.project;
  this.$el = $('<div class="container-fluid">'
    + '<div class="row">'
    + '<div data-name="configPane" class="col-xs-2"></div>'
    + '<div class="col-xs-10"><div style="position:relative;" data-name="chartDiv"></div></div>'
    + '</div></div>');

  var formBuilder = new phantasus.FormBuilder({
    formStyle: 'vertical'
  });
  this.formBuilder = formBuilder;
  formBuilder.append({
    name: 'chart_type',
    type: 'bootstrap-select',
    options: [
      'row profile', 'column profile', 'boxplot']
  });
  var rowOptions = [];
  var columnOptions = [];
  var numericRowOptions = [];
  var numericColumnOptions = [];
  var options = [];
  var numericOptions = [];
  var updateOptions = function () {
    var dataset = project.getFullDataset();
    rowOptions = [
      {
        name: '(None)',
        value: ''
      }];
    columnOptions = [
      {
        name: '(None)',
        value: ''
      }];
    numericRowOptions = [
      {
        name: '(None)',
        value: ''
      }];
    numericColumnOptions = [
      {
        name: '(None)',
        value: ''
      }];
    options = [
      {
        name: '(None)',
        value: ''
      }];
    numericOptions = [
      {
        name: '(None)',
        value: ''
      }];

    phantasus.MetadataUtil.getMetadataNames(dataset.getRowMetadata())
      .forEach(
        function (name) {
          var dataType = phantasus.VectorUtil
            .getDataType(dataset.getRowMetadata()
              .getByName(name));
          if (dataType === 'number'
            || dataType === '[number]') {
            numericRowOptions.push({
              name: name + ' (row)',
              value: name + '_r'
            });
          }
          rowOptions.push({
            name: name + ' (row)',
            value: name + '_r'
          });
        });

    phantasus.MetadataUtil.getMetadataNames(dataset.getColumnMetadata())
      .forEach(
        function (name) {
          var dataType = phantasus.VectorUtil
            .getDataType(dataset.getColumnMetadata()
              .getByName(name));
          if (dataType === 'number'
            || dataType === '[number]') {
            numericColumnOptions.push({
              name: name + ' (column)',
              value: name + '_c'
            });
          }
          columnOptions.push({
            name: name + ' (column)',
            value: name + '_c'
          });
        });

    options = options.concat(rowOptions.slice(1));
    options = options.concat(columnOptions.slice(1));

    numericOptions = numericOptions.concat(numericRowOptions.slice(1));
    numericOptions = numericOptions.concat(numericColumnOptions.slice(1));
  };

  updateOptions();
  formBuilder.append({
    name: 'group_by',
    type: 'bootstrap-select',
    options: options
  });

  formBuilder.append({
    name: 'axis_label',
    type: 'bootstrap-select',
    options: rowOptions
  });
  formBuilder.append({
    name: 'show_outliers',
    type: 'checkbox',
    value: true
  });

  formBuilder.append({
    name: 'color',
    type: 'bootstrap-select',
    options: options
  });

  // formBuilder.append({
  //   name: 'size',
  //   type: 'bootstrap-select',
  //   options: numericOptions
  // });
  formBuilder.append({
    name: 'tooltip',
    type: 'bootstrap-select',
    multiple: true,
    search: true,
    options: options.slice(1)
  });

  formBuilder.append({
    name: 'chart_width',
    type: 'range',
    value: 400,
    min: 60,
    max: 800,
    step: 10
  });
  formBuilder.append({
    name: 'chart_height',
    type: 'range',
    value: 400,
    min: 20,
    max: 800,
    step: 10
  });
  formBuilder.append({
    name: 'export_to_SVG',
    type: 'button'
  });

  var chartTypeToParameter = {
    'row profile': {
      axis_label: 'columns',
      tooltip: 'columns',
      color: 'rows'
    },
    'column profile': {
      axis_label: 'rows',
      tooltip: 'rows',
      color: 'columns'
    },
    boxplot: {
      group_by: true,
      show_outliers: true,
      tooltip: 'both'
    }
  };

  function setVisibility() {
    var chartType = formBuilder.getValue('chart_type');
    var chartOptions = chartTypeToParameter[chartType];
    if (chartOptions.axis_label != null) {
      formBuilder.setOptions('axis_label',
        chartOptions.axis_label === 'rows' ? rowOptions : columnOptions,
        true);

    }
    formBuilder.setVisible('color', chartOptions.color != null);
    formBuilder.setVisible('axis_label', chartOptions.axis_label != null);
    formBuilder.setVisible('group_by', chartOptions.group_by);
    formBuilder.setVisible('show_outliers', chartOptions.show_outliers);
    formBuilder.setOptions('tooltip', chartOptions.tooltip === 'rows' ? rowOptions.slice(1) : (chartOptions.tooltip === 'columns' ? columnOptions.slice(1) : options));
    formBuilder.setOptions('color', chartOptions.color === 'rows' ? rowOptions : (chartOptions.color === 'columns' ? columnOptions : options));
  }

  this.tooltip = [];
  var draw = function () {
    _.debounce(_this.draw(), 100);
  };
  formBuilder.$form.on('change', 'select,input[type=range]', function (e) {
    if ($(this).attr('name') === 'tooltip') {
      var tooltipVal = _this.formBuilder.getValue('tooltip');
      _this.tooltip.length = 0; // clear array
      if (tooltipVal != null) {
        tooltipVal.forEach(function (tip) {
          _this.tooltip.push(phantasus.ChartTool.getVectorInfo(tip));
        });
      }
    } else {
      setVisibility();
      draw();
    }

  });

  formBuilder.$form.on('click', 'input[type=checkbox]', function (e) {
    draw();

  });
  formBuilder.$form.on('keypress', 'input[type=text]', function (e) {
    if (e.which === 13) {
      draw();
    }
  });

  setVisibility();

  var trackChanged = function () {
    updateOptions();
    setVisibility();
    formBuilder.setOptions('group_by', options, true);
  };

  project.getColumnSelectionModel().on('selectionChanged.chart', draw);
  project.getRowSelectionModel().on('selectionChanged.chart', draw);
  project.on('trackChanged.chart', trackChanged);
  this.$chart = this.$el.find('[data-name=chartDiv]');
  var $dialog = $('<div style="background:white;" title="Chart"></div>');
  var $configPane = this.$el.find('[data-name=configPane]');
  formBuilder.$form.appendTo($configPane);
  this.$el.appendTo($dialog);

  this.exportButton = this.$el.find('button[name=export_to_SVG]');
  this.exportButton.on('click', function () {
    var svgs = _this.$el.find("svg");
    if (svgs.length < 1) {
      throw Error('Chart is not ready. Cannot export')
    }

    var svgx = svgs[0].cloneNode(true);
    $(svgx).find('[fill="rgba(0,0,0,0)"]').attr('fill-opacity', '0');
    phantasus.Util.saveAsSVG(svgx, "chart.svg");
  });


  $dialog.dialog({
    dialogClass: 'phantasus',
    close: function (event, ui) {
      project.off('trackChanged.chart', trackChanged);
      project.getRowSelectionModel().off('selectionChanged.chart', draw);
      project.getColumnSelectionModel().off('selectionChanged.chart',
        draw);
      $dialog.dialog('destroy').remove();
      event.stopPropagation();
    },

    resizable: true,
    height: 600,
    width: 900
  });
  this.$dialog = $dialog;
  this.draw();
};

phantasus.ChartTool.getVectorInfo = function (value) {
  var field = value.substring(0, value.length - 2);
  var isColumns = value.substring(value.length - 2) === '_c';
  return {
    field: field,
    isColumns: isColumns
  };
};
phantasus.ChartTool.prototype = {
   /**
   *
   * @param options.dataset
   * @param options.colorByVector
   * @param options.colorModel
   * @param options.transpose
   * @param options.chartWidth
   * @param options.chartHeight
   * @param options.axisLabelVector
   * @private
   */
  _createProfile: function (options) {
    var _this = this;
    var dataset = options.dataset;
    var colorByVector = options.colorByVector;
    var colorModel = options.colorModel;
    var heatmap = this.heatmap;
    var chartWidth = options.chartWidth;
    var chartHeight = options.chartHeight;
    var axisLabelVector = options.axisLabelVector; // for row scatter, row vector
    var transpose = options.transpose;
    var axisLabel = [];
    var rotateXAxis = 0;
    var bottomPadding = 60;
    for (var j = 0, ncols = dataset.getColumnCount(); j < ncols; j++) {
      axisLabel.push(axisLabelVector != null ? axisLabelVector.getValue(j) : '' + j);
    }

    if (dataset.getColumnCount() >= 5 &&
        axisLabel.every(function (val) { return val.length >= 2;}) ||
        axisLabel.some(function (val) { return val.length >= 7;})) {
      rotateXAxis = 45;
      bottomPadding = 150;
    }

    var series = [];
    var colorMap = phantasus.VectorColorModel.getColorMapForNumber(dataset.getRowCount());
    for (var i = 0, nrows = dataset.getRowCount(); i < nrows; i++) {
      // each row is a new trace
      var colorByValue = colorByVector != null ? colorByVector.getValue(i) : '' + i;
      var color = colorByVector != null ? colorModel.getMappedValue(colorByVector, colorByValue) : colorMap[i % colorMap.length];
      var data = [];
      for (var j = 0, ncols = dataset.getColumnCount(); j < ncols; j++) {
        data.push([j, dataset.getValue(i, j), i]);
      }
      series.push({
        name: colorByValue,
        type: 'line',
        data: data,
        tooltip: {
          formatter: function (obj) {
            var value = obj.value;
            var s = [];
            s.push(_this.heatmap.getHeatMapElementComponent().getDrawValuesFormat()(value[1]));
            phantasus.ChartTool.getTooltip({
              text: s,
              tooltip: _this.tooltip,
              dataset: dataset,
              rowIndex: value[2],
              columnIndex: value[0]
            });
            return s.join('');
          }
        }
      });
    }

    var chart = {
      legend: {
        orient: 'vertical',
        left: 'right',
        top: 2,
        itemWidth: 14,
        height: dataset.getRowCount() * 25,
        data: series.map(function (s) {
          return s.name;
        })
      },
      animation: false,
      tooltip: {
        trigger: 'item'
      },
      xAxis: {
        type: 'category',
        data: axisLabel,
        axisLabel: {
          rotate: rotateXAxis,
          interval: 0
        },
        axisTick: {
          alignWithLabel: true
        }
      },
      yAxis: {
        axisLine: {
          show: true,
          onZero: false
        },
        type: 'value',
        name: ''
      },
      grid: {right: 120, bottom: bottomPadding},
      series: series
    };

    var myChart = echarts.init(options.el, null, {renderer: 'svg'});
    myChart.setOption(chart);
  },
  /**
   *
   * @param options.datasets 1-d array of datasets
   * @param options.ids 1-d array of grouping values
   * @param options.showOutliers
   * @param options.el
   * @private
   */
  _createBoxPlot: function (options) {
    var _this = this;
    var showPoints = options.showPoints;
    var datasets = options.datasets;
    var ids = options.ids;
    var heatmap = this.heatmap;
    var size = 6;
    var boxData = [];
    var outliers = [];

    for (var k = 0, ndatasets = datasets.length; k < ndatasets; k++) {
      var dataset = datasets[k];
      var id = ids[k];
      var values = new Float32Array(dataset.getRowCount() * dataset.getColumnCount());
      var counter = 0;
      for (var i = 0, nrows = dataset.getRowCount(); i < nrows; i++) {
        for (var j = 0, ncols = dataset.getColumnCount(); j < ncols; j++) {
          var value = dataset.getValue(i, j);
          if (!isNaN(value)) {
            values[counter] = value;
            counter++;
          }
        }
      }
      if (counter !== values.length) {
        values = values.slice(0, counter);
      }
      values.sort();
      // [min,  Q1,  median,  Q3,  max]
      var item = phantasus.BoxPlotArrayItem(values);
      boxData.push([item.lowerAdjacentValue, item.q1, item.median, item.q3, item.upperAdjacentValue]);
      if (options.showOutliers) {
        var w = 1.5;
        var upperOutlier = item.q3 + w * (item.q3 - item.q1);
        var lowerOutlier = item.q1 - w * (item.q3 - item.q1);
        for (var i = 0, nrows = dataset.getRowCount(); i < nrows; i++) {
          for (var j = 0, ncols = dataset.getColumnCount(); j < ncols; j++) {
            var value = dataset.getValue(i, j);
            if (value > upperOutlier || value < lowerOutlier) {
              outliers.push([id, value, i, j]);
            }
          }
        }
      }
    }
    var chart = {
      animation: false,
      tooltip: {
        trigger: 'item'
      },
      xAxis: {
        type: 'category',
        data: ids
      },
      yAxis: {
        axisLine: {
          show: true,
          onZero: false
        },
        type: 'value',
        name: ''
      },
      series: [
        {
          animationDuration: 0,
          hoverAnimation: false,
          name: 'boxplot',
          type: 'boxplot',
          data: boxData,
          tooltip: {
            formatter: function (param) {
              var text = [];
              if (param.name !== '') {
                text.push(param.name);
              }

              text = text.concat([
                'upper: ' + _this.heatmap.getHeatMapElementComponent().getDrawValuesFormat()(param.data[4]),
                'Q3: ' + _this.heatmap.getHeatMapElementComponent().getDrawValuesFormat()(param.data[3]),
                'median: ' + _this.heatmap.getHeatMapElementComponent().getDrawValuesFormat()(param.data[2]),
                'Q1: ' + _this.heatmap.getHeatMapElementComponent().getDrawValuesFormat()(param.data[1]),
                'lower: ' + _this.heatmap.getHeatMapElementComponent().getDrawValuesFormat()(param.data[0])
              ]);
              return text.join('<br/>');
            }
          }
        },
        {
          name: 'outlier',
          type: 'scatter',
          data: outliers,
          symbolSize: 5,
          itemStyle: {
            normal: {
              borderWidth: 1,
              borderColor: 'black',
              opacity: 0.8
            }
          },
          tooltip: {
            formatter: function (obj) {
              var value = obj.value;
              var s = [];
              if (value[0] !== '') {
                s.push(value[0]); // name
                s.push('<br>');
              }
              s.push(_this.heatmap.getHeatMapElementComponent().getDrawValuesFormat()(value[1]));
              phantasus.ChartTool.getTooltip({
                text: s,
                tooltip: _this.tooltip,
                dataset: dataset,
                rowIndex: value[2],
                columnIndex: value[3]
              });
              return s.join('');
            }
          }
        }
      ]
    };

    var myChart = echarts.init(options.el, null, {renderer: 'svg'});
    myChart.setOption(chart);
  },
  draw: function () {
    var _this = this;
    this.$chart.empty();
    // 140 to 800
    var gridWidth = parseInt(this.formBuilder.getValue('chart_width'));
    var gridHeight = parseInt(this.formBuilder.getValue('chart_height'));
    var showOutliers = this.formBuilder.getValue('show_outliers');

    var groupBy = this.formBuilder.getValue('group_by');
    var axisLabel = this.formBuilder.getValue('axis_label');

    // var sizeBy = this.formBuilder.getValue('size');
    var chartType = this.formBuilder.getValue('chart_type');

    var dataset = this.project.getSelectedDataset({
      emptyToAll: false
    });

    this.dataset = dataset;
    if (dataset.getRowCount() === 0 && dataset.getColumnCount() === 0) {
      $('<h4>Please select rows and columns in the heat map.</h4>')
        .appendTo(this.$chart);
      return;
    } else if (dataset.getRowCount() === 0) {
      $('<h4>Please select rows in the heat map.</h4>')
        .appendTo(this.$chart);
      return;
    }
    if (dataset.getColumnCount() === 0) {
      $('<h4>Please select columns in the heat map.</h4>')
        .appendTo(this.$chart);
      return;
    }

    var heatmap = this.heatmap;
    // var sizeByInfo = phantasus.ChartTool.getVectorInfo(sizeBy);

    // var sizeByVector = sizeByInfo.isColumns ? dataset.getColumnMetadata().getByName(sizeByInfo.field) : dataset.getRowMetadata().getByName(
    //   sizeByInfo.field);

    var axisLabelInfo = phantasus.ChartTool.getVectorInfo(axisLabel);
    var axisLabelVector = axisLabelInfo.isColumns ? dataset.getColumnMetadata().getByName(axisLabelInfo.field) : dataset.getRowMetadata().getByName(
      axisLabelInfo.field);

    var rowIds = [undefined];
    var columnIds = [undefined];
    var colorBy = this.formBuilder.getValue('color');
    var colorByVector = null;
    var colorModel = null;
    if (colorBy != null) {
      var colorByInfo = phantasus.ChartTool.getVectorInfo(colorBy);
      colorModel = !colorByInfo.isColumns ? this.project.getRowColorModel()
        : this.project.getColumnColorModel();
      colorByVector = colorByInfo.isColumns ? dataset.getColumnMetadata().getByName(colorByInfo.field) : dataset.getRowMetadata().getByName(
        colorByInfo.field);
    }

    if (chartType === 'row profile' || chartType === 'column profile') {
      var transpose = chartType === 'column profile';
      if (transpose) {
        dataset = new phantasus.TransposedDatasetView(dataset);
      }
      if (dataset.getRowCount() > 100) {
        $('<h4>Maximum chart size exceeded.</h4>')
          .appendTo(this.$chart);
        return;
      }
      // add horizontal space for legend
      var $chart = $('<div style="width: ' + (gridWidth + 120) + 'px;height:' + gridHeight + 'px;"></div>');
      $chart.appendTo(this.$chart);
      this._createProfile({
        width: gridWidth,
        el: $chart[0],
        dataset: dataset,
        chartWidth: gridWidth,
        chartHeight: gridHeight,
        transpose: transpose,
        colorModel: colorModel,
        colorByVector: colorByVector,
        axisLabelVector: axisLabelVector
      });
    } else if (chartType === 'boxplot') {
      var datasets = [];//1-d array of datasets
      var ids = []; // 1-d array of grouping values
      if (groupBy) {
        var groupByInfo = phantasus.ChartTool
          .getVectorInfo(groupBy);
        var vector = groupByInfo.isColumns ? dataset
            .getColumnMetadata().getByName(groupByInfo.field)
          : dataset.getRowMetadata().getByName(
            groupByInfo.field);
        var isArray = phantasus.VectorUtil.getDataType(vector)[0] === '[';
        var valueToIndices = phantasus.VectorUtil.createValueToIndicesMap(vector, true);
        valueToIndices.forEach(function (indices, value) {
          datasets.push(new phantasus.SlicedDatasetView(dataset, groupByInfo.isColumns ? null : indices, groupByInfo.isColumns ? indices : null));
          ids.push(value);
        });
      } else {
        datasets.push(dataset);
        ids.push('');
      }
      // sort rows and columns by median
      // if (gridRowCount > 1) {
      //   var summary = [];
      //   for (var i = 0; i < gridRowCount; i++) {
      //     summary[i] = [];
      //     var gridRow = grid[i];
      //     for (var j = 0; j < gridColumnCount; j++) {
      //       var array = gridRow[j];
      //       var values = [];
      //       if (array) {
      //         for (var k = 0, nitems = array.length; k < nitems; k++) {
      //           var item = array[k];
      //           var value = dataset.getValue(item.row, item.column);
      //           if (!isNaN(value)) {
      //             values.push(value);
      //           }
      //
      //         }
      //       }
      //       summary[i][j] = phantasus.Median(phantasus.VectorUtil.arrayAsVector(values));
      //     }
      //   }
      //   // sort rows
      //   var rowMedians = [];
      //   for (var i = 0; i < gridRowCount; i++) {
      //     var values = [];
      //     for (var j = 0; j < gridColumnCount; j++) {
      //       values.push(summary[i][j]);
      //     }
      //     rowMedians.push(phantasus.Median(phantasus.VectorUtil.arrayAsVector(values)));
      //   }
      //
      //   var newRowOrder = phantasus.Util.indexSort(rowMedians, false);
      //   var newRowIds = [];
      //   var newGrid = [];
      //   for (var i = 0; i < gridRowCount; i++) {
      //     newGrid.push(grid[newRowOrder[i]]);
      //     newRowIds.push(rowIds[newRowOrder[i]]);
      //   }
      //   grid = newGrid;
      //   rowIds = newRowIds;
      // }

      var $chartEl = $('<div style="width: ' + gridWidth + 'px;height:' + gridHeight + 'px;"></div>');
      $chartEl.appendTo(this.$chart);
      this._createBoxPlot({
        showOutliers: showOutliers,
        el: $chartEl[0],
        datasets: datasets,
        ids: ids
      });
    }
  }
};

/**
 *
 * @param options.dataset
 * @param options.text
 * @param options.rowIndex
 * @param options.columnIndex
 */
phantasus.ChartTool.getTooltip = function (options) {
  for (var tipIndex = 0; tipIndex < options.tooltip.length; tipIndex++) {
    var tip = options.tooltip[tipIndex];
    var metadata;
    var index;
    if (tip.isColumns) {
      metadata = options.dataset.getColumnMetadata();
      index = options.columnIndex;
    } else {
      metadata = options.dataset.getRowMetadata();
      index = options.rowIndex;
    }
    if (index !== -1) {
      var v = metadata.getByName(tip.field);
      phantasus.HeatMapTooltipProvider.vectorToString(v,
        index, options.text, '<br>');
    }
  }
};

