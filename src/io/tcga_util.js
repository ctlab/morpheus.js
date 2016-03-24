morpheus.TcgaUtil = function() {

};

morpheus.TcgaUtil.DISEASE_STUDIES = {
	'LAML' : 'Acute Myeloid Leukemia',
	'ACC' : 'Adrenocortical carcinoma',
	'BLCA' : 'Bladder Urothelial Carcinoma',
	'LGG' : 'Brain Lower Grade Glioma',
	'BRCA' : 'Breast invasive carcinoma',
	'CESC' : 'Cervical squamous cell carcinoma and endocervical adenocarcinoma',
	'CHOL' : 'Cholangiocarcinoma',
	'LCML' : 'Chronic Myelogenous Leukemia',
	'COAD' : 'Colon adenocarcinoma',
	'CNTL' : 'Controls',
	'ESCA' : 'Esophageal carcinoma ',
	'FPPP' : 'FFPE Pilot Phase II',
	'GBM' : 'Glioblastoma multiforme',
	'HNSC' : 'Head and Neck squamous cell carcinoma',
	'KICH' : 'Kidney Chromophobe',
	'KIRC' : 'Kidney renal clear cell carcinoma',
	'KIRP' : 'Kidney renal papillary cell carcinoma',
	'LIHC' : 'Liver hepatocellular carcinoma',
	'LUAD' : 'Lung adenocarcinoma',
	'LUSC' : 'Lung squamous cell carcinoma',
	'DLBC' : 'Lymphoid Neoplasm Diffuse Large B-cell Lymphoma',
	'MESO' : 'Mesothelioma',
	'MISC' : 'Miscellaneous',
	'OV' : 'Ovarian serous cystadenocarcinoma',
	'PAAD' : 'Pancreatic adenocarcinoma',
	'PCPG' : 'Pheochromocytoma and Paraganglioma',
	'PRAD' : 'Prostate adenocarcinoma',
	'READ' : 'Rectum adenocarcinoma',
	'SARC' : 'Sarcoma',
	'SKCM' : 'Skin Cutaneous Melanoma',
	'STAD' : 'Stomach adenocarcinoma',
	'TGCT' : 'Testicular Germ Cell Tumors',
	'THYM' : 'Thymoma',
	'THCA' : 'Thyroid carcinoma',
	'UCS' : 'Uterine Carcinosarcoma',
	'UCEC' : 'Uterine Corpus Endometrial Carcinoma',
	'UVM' : 'Uveal Melanoma',
	'KIPAN' : 'Pan-Kidney Cohort',
	'COADREAD' : 'Colonrectal adenocarcinoma',
	'GBMLGG' : 'Glioma',
	'STES' : 'Stomach and Esophageal Carcinoma'
};
morpheus.TcgaUtil.SAMPLE_TYPES = {
	'01' : 'Primary solid Tumor',
	'02' : 'Recurrent Solid Tumor',
	'03' : 'Primary Blood Derived Cancer - Peripheral Blood',
	'04' : 'Recurrent Blood Derived Cancer - Bone Marrow',
	'05' : 'Additional - New Primary',
	'06' : 'Metastatic',
	'07' : 'Additional Metastatic',
	'08' : 'Human Tumor Original Cells',
	'09' : 'Primary Blood Derived Cancer - Bone Marrow',
	'10' : 'Blood Derived Normal',
	'11' : 'Solid Tissue Normal',
	'12' : 'Buccal Cell Normal',
	'13' : 'EBV Immortalized Normal',
	'14' : 'Bone Marrow Normal',
	'20' : 'Control Analyte',
	'40' : 'Recurrent Blood Derived Cancer - Peripheral Blood',
	'50' : 'Cell Lines',
	'60' : 'Primary Xenograft Tissue',
	'61' : 'Cell Line Derived Xenograft Tissue'
};

morpheus.TcgaUtil.barcode = function(s) {
	var tokens = s.split('-');
	var id = tokens[2];
	var sampleType;
	if (tokens.length > 3) {
		sampleType = tokens[3];
		if (sampleType.length > 2) {
			sampleType = sampleType.substring(0, 2);

		}
		sampleType = morpheus.TcgaUtil.SAMPLE_TYPES[sampleType];
	} else {
		sampleType = morpheus.TcgaUtil.SAMPLE_TYPES['01'];
	}
	return {
		id : id.toLowerCase(),
		sampleType : sampleType
	};
};

morpheus.TcgaUtil.getDataset = function(options) {
	var promises = [];
	var datasets = [];
	var returnDeferred = $.Deferred();
	function splitId(dataset) {
		var idVector = dataset.getRowMetadata().get(0);
		for (var i = 0, size = idVector.size(); i < size; i++) {
			var id = idVector.getValue(i);
			var index = id.indexOf('|');
			idVector.setValue(i, id.substring(0, index));
		}
	}
	function setIdAndSampleType(dataset) {
		var idVector = dataset.getColumnMetadata().get(0);
		var participantId = dataset.getColumnMetadata().add('participant_id');
		var sampleType = dataset.getColumnMetadata().add('sample_type');
		for (var i = 0, size = idVector.size(); i < size; i++) {
			var barcode = morpheus.TcgaUtil.barcode(idVector.getValue(i));
			if (barcode.sampleType !== undefined) {
				idVector.setValue(i, barcode.id + '-' + barcode.sampleType);
				sampleType.setValue(i, barcode.sampleType);
			} else {
				idVector.setValue(i, barcode.id);
			}
			participantId.setValue(i, barcode.id);

		}
	}
	if (options.mrna) {
		// id + type
		var mrna = $.Deferred();
		promises.push(mrna);
		new morpheus.TxtReader().read(options.mrna, function(err, dataset) {
			if (err) {
				console.log('Error reading file:' + err);
			} else {
				datasets.push(dataset);
				// splitId(dataset);
				setIdAndSampleType(dataset);
			}
			mrna.resolve();
		});
	}
	var sigGenesLines;
	if (options.mutation) {
		var mutation = $.Deferred();
		promises.push(mutation);
		new morpheus.MafFileReader().read(options.mutation, function(err,
				dataset) {
			if (err) {
				console.log('Error reading file:' + err);
			} else {
				datasets.push(dataset);
				setIdAndSampleType(dataset);
			}
			mutation.resolve();
		});
		var sigGenesAnnotation = morpheus.Util.readLines(options.sigGenes);
		sigGenesAnnotation.done(function(lines) {
			sigGenesLines = lines;
		});
		promises.push(sigGenesAnnotation);
	}
	if (options.gistic) {
		var gistic = $.Deferred();
		promises.push(gistic);
		new morpheus.GisticReader().read(options.gistic,
				function(err, dataset) {
					if (err) {
						console.log('Error reading file:' + err);
					} else {
						datasets.push(dataset);
						setIdAndSampleType(dataset);
					}
					gistic.resolve();
				});

	}
	if (options.gisticGene) {
		var gisticGene = $.Deferred();
		promises.push(gisticGene);

		new morpheus.TxtReader({
			dataColumnStart : 3

		}).read(options.gisticGene, function(err, dataset) {
			if (err) {
				console.log('Error reading file:' + err);
			} else {
				datasets.push(dataset);
				setIdAndSampleType(dataset);
			}
			gisticGene.resolve();
		});

	}
	if (options.seg) {
		var seg = $.Deferred();
		promises.push(seg);
		new morpheus.SegTabReader().read(options.seg, function(err, dataset) {
			if (err) {
				console.log('Error reading file:' + err);
			} else {
				datasets.push(dataset);
				setIdAndSampleType(dataset);
			}
			seg.resolve();
		});
	}
	if (options.rppa) {
		// id + type
		var rppa = $.Deferred();
		promises.push(rppa);

		new morpheus.TxtReader().read(options.rppa, function(err, dataset) {
			if (err) {
				console.log('Error reading file:' + err);
			} else {
				datasets.push(dataset);
				setIdAndSampleType(dataset);
			}
			// splitId(dataset);

			rppa.resolve();
		});

	}
	if (options.methylation) {
		// id + type
		var methylation = $.Deferred();
		promises.push(methylation);
		new morpheus.TxtReader({}).read(options.methylation, function(err,
				dataset) {
			if (err) {
				console.log('Error reading file:' + err);
			} else {
				datasets.push(dataset);
				setIdAndSampleType(dataset);
			}
			methylation.resolve();
		});
	}

	var mrnaClustPromise = morpheus.Util.readLines(options.mrnaClust);
	promises.push(mrnaClustPromise);
	var sampleIdToClusterId;
	mrnaClustPromise.done(function(lines) {
		// SampleName cluster silhouetteValue
		// SampleName cluster silhouetteValue
		// TCGA-OR-A5J1-01 1 0.00648776228925048
		sampleIdToClusterId = new morpheus.Map();
		var lineNumber = 0;
		while (lines[lineNumber].indexOf('SampleName') !== -1) {
			lineNumber++;
		}
		var tab = /\t/;
		for (; lineNumber < lines.length; lineNumber++) {
			var tokens = lines[lineNumber].split(tab);
			var barcode = morpheus.TcgaUtil.barcode(tokens[0]);
			sampleIdToClusterId.set(barcode.id, tokens[1]);
		}
	});
	var annotationCallbacks = [];
	var annotationDef = null;
	if (options.columnAnnotations) {
		annotationDef = morpheus.DatasetUtil.annotate({
			annotations : options.columnAnnotations,
			isColumns : true
		});
		promises.push(annotationDef);
		annotationDef.done(function(array) {
			annotationCallbacks = array;
		});
	}
	$.when.apply($, promises).then(
			function() {
				var datasetToReturn = null;
				if (datasets.length === 1) {
					var sourceName = datasets[0].getName();
					var sourceVector = datasets[0].getRowMetadata().add(
							'Source');
					for (var i = 0; i < sourceVector.size(); i++) {
						sourceVector.setValue(i, sourceName);
					}
					datasetToReturn = datasets[0];

				} else {
					var maxIndex = 0;
					var maxColumns = datasets[0].getColumnCount();
					// use dataset with most columns as the reference or
					// mutation data
					for (var i = 1; i < datasets.length; i++) {
						if (datasets[i].getColumnCount() > maxColumns) {
							maxColumns = datasets[i].getColumnCount();
							maxIndex = i;
						}
						if (datasets[i].getName() === 'mutations_merged.maf') {
							maxColumns = Number.MAX_VALUE;
							maxIndex = i;
						}
					}
					var datasetIndices = [];
					datasetIndices.push(maxIndex);
					for (var i = 0; i < datasets.length; i++) {
						if (i !== maxIndex) {
							datasetIndices.push(i);
						}
					}

					var joined = new morpheus.JoinedDataset(
							datasets[datasetIndices[0]],
							datasets[datasetIndices[1]], 'id', 'id');
					for (var i = 2; i < datasetIndices.length; i++) {
						joined = new morpheus.JoinedDataset(joined,
								datasets[datasetIndices[i]], 'id', 'id');
					}
					datasetToReturn = joined;
				}

				var clusterIdVector = datasetToReturn.getColumnMetadata().add(
						'mRNAseq_cluster');
				var idVector = datasetToReturn.getColumnMetadata().getByName(
						'participant_id');
				for (var j = 0, size = idVector.size(); j < size; j++) {
					clusterIdVector.setValue(j, sampleIdToClusterId
							.get(idVector.getValue(j)));
				}
				// view in space of mutation sample ids only
				if (options.mutation) {
					var sourceToIndices = morpheus.VectorUtil
							.createValueToIndicesMap(datasetToReturn
									.getRowMetadata().getByName('Source'));
					var mutationDataset = new morpheus.SlicedDatasetView(
							datasetToReturn, sourceToIndices
									.get('mutations_merged.maf'));
					new morpheus.OpenFileTool()
							.annotate(sigGenesLines, mutationDataset, false,
									null, 'id', 'gene', [ 'q' ]);
					var qVector = mutationDataset.getRowMetadata().getByName(
							'q');
					var qValueVector = mutationDataset.getRowMetadata()
							.getByName('q_value');
					if (qValueVector == null) {
						qValueVector = mutationDataset.getRowMetadata().add(
								'q_value');
					}
					for (var i = 0, size = qValueVector.size(); i < size; i++) {
						qValueVector.setValue(i, qVector.getValue(i));
					}

					mutationDataset.getRowMetadata().remove(
							morpheus.MetadataUtil.indexOf(mutationDataset
									.getRowMetadata(), 'q'));
				}
				if (annotationDef) {
					annotationCallbacks.forEach(function(f) {
						f(datasetToReturn);
					});
				}
				returnDeferred.resolve(datasetToReturn);
			});
	return returnDeferred;
};