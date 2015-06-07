ShapeTracer = function ()
{
	this.gpuTracer = null;
	this.fragmentShader = null;
	this.settings = null;
	this.model = null;
};

ShapeTracer.prototype.Init = function (canvasElem, controlsElem, fragmentShaderElem)
{
	if (!this.InitUserInterface (controlsElem)) {
		return false;
	}
	
	if (!this.InitRenderer (canvasElem, fragmentShaderElem)) {
		return false;
	}
	
	return true;
};

ShapeTracer.prototype.InitUserInterface = function (controlsElem)
{
	this.settings = {
		light : {
			rotation : 1.0,
			distance : 3.0,
			height : 5.0,
			radius : 0.5
		}
	};	
	
	var myThis = this;
	
	UserInterface.AddTitle (controlsElem, 'light position');
	mainElem = UserInterface.AddMainElem (controlsElem);
	UserInterface.AddSliderControl (mainElem, 'rotation', UserInterface.ToSlider (this.settings.light.rotation, 0.0, 2.0 * Math.PI), function (ratio) {
		myThis.settings.light.rotation = UserInterface.FromSlider (ratio, 0.0, 2.0 * Math.PI);
		myThis.UpdateUniforms ();
		myThis.StartRender (true);		
	});
	UserInterface.AddSliderControl (mainElem, 'distance', UserInterface.ToSlider (myThis.settings.light.distance, 1.0, 5.0), function (ratio) {
		myThis.settings.light.distance = UserInterface.FromSlider (ratio, 1.0, 5.0);
		myThis.UpdateUniforms ();
		myThis.StartRender (true);		
	});	
	UserInterface.AddSliderControl (mainElem, 'height', UserInterface.ToSlider (myThis.settings.light.height, 1.0, 8.0), function (ratio) {
		myThis.settings.light.height = UserInterface.FromSlider (ratio, 1.0, 8.0);
		myThis.UpdateUniforms ();
		myThis.StartRender (true);		
	});	
    UserInterface.AddSliderControl (mainElem, 'radius', UserInterface.ToSlider (myThis.settings.light.radius, 0.0, 1.0), function (ratio) {
		myThis.settings.light.radius = UserInterface.FromSlider (ratio, 0.0, 1.0);
		myThis.UpdateUniforms ();
		myThis.StartRender (true);		
	});

	return true;
};

ShapeTracer.prototype.InitRenderer = function (canvasElem, fragmentShaderElem)
{
	this.fragmentShader = fragmentShaderElem.childNodes[0].nodeValue;

	var camera = new JSM.Camera (
		new JSM.Coord (5, 3, 4),
		new JSM.Coord (0, 0, 1),
		new JSM.Coord (0, 0, 1)
	);
	
	var maxIteration = 256;
	var myThis = this;
	
	this.gpuTracer = new GPUTracer ();
	var callbacks = {};
	
	if (!this.gpuTracer.Init (canvasElem, camera, maxIteration, callbacks)) {
		return false;
	}
	
	if (!this.Compile ()) {
		return false;
	}
	
	this.StartRender (false);
	return true;
};

ShapeTracer.prototype.Compile = function ()
{
	this.model = {
		room : {
			min : [-10, -10, 0],
			max : [10, 10, 20],
			material : {
				diffuse : [0.6, 0.6, 0.6],
				reflection : 0.0
			}
		},
		spheres : [
			{
				origin : [2.5, 0, 1],
				radius : 1.0,
				material : {
					diffuse : [0.0, 0.0, 0.7],
					reflection : 0.0
				}
			}
		],
		boxes : [
			{
				min : [-1, -1, 0],
				max : [1, 1, 2],
				material : {
					diffuse : [0.7, 0.0, 0.0],
					reflection : 0.0
				}
			}
		],
		cylinders : [
			{
				origin : [-2.5, 0, 0],
				radius : 1,
				height : 2,
				material : {
					diffuse : [0.0, 0.7, 0.0],
					reflection : 0.0
				}
			}
		]
	};
	
	var timer = new JSM.Timer ();
	timer.Start ();
	var defines = [
		'#define SPHERE_COUNT ' + this.model.spheres.length,
		'#define BOX_COUNT ' + this.model.boxes.length,
		'#define CYLINDER_COUNT ' + this.model.cylinders.length
	].join ('\n');
	var result = this.gpuTracer.Compile (defines + this.fragmentShader, function (error) {
		console.log (error);
	});
	if (!result) {
		return false;
	}
	if (!this.UpdateUniforms ()) {
		return false;
	}
	timer.Stop ();
	console.log ('Compile time: ' + timer.Result ());
	return true;
};

ShapeTracer.prototype.UpdateUniforms = function ()
{
	function GetLightPosition (lightData)
	{
		var origo = new JSM.Coord2D (0.0, 0.0);
		var lightPosition = JSM.CoordRotate2D (new JSM.Coord2D (1.0, 0.0), lightData.rotation, origo);
		lightPosition = JSM.VectorSetLength2D (lightPosition, lightData.distance);
		return new JSM.Coord (lightPosition.x, lightPosition.y, lightData.height);
	}

	this.gpuTracer.GetNavigation ().SetNearDistanceLimit (1.0);
	this.gpuTracer.GetNavigation ().SetFarDistanceLimit (20.0);
	var lightPosition = GetLightPosition (this.settings.light);
	this.gpuTracer.SetUniformVector ('uLightPosition', [lightPosition.x, lightPosition.y, lightPosition.z]);
	this.gpuTracer.SetUniformFloat ('uLightRadius', this.settings.light.radius);

	this.gpuTracer.SetUniformVector ('uRoomBox.min', this.model.room.min);
	this.gpuTracer.SetUniformVector ('uRoomBox.max', this.model.room.max);
	this.gpuTracer.SetUniformVector ('uRoomBox.material.diffuse', this.model.room.material.diffuse);
	this.gpuTracer.SetUniformFloat ('uRoomBox.material.reflection', this.model.room.material.reflection);

	var i;
	for (i = 0; i < this.model.spheres.length; i++) {
		this.gpuTracer.SetUniformVector ('uSpheres[' + i + '].origin', this.model.spheres[i].origin);
		this.gpuTracer.SetUniformFloat ('uSpheres[' + i + '].radius', this.model.spheres[i].radius);
		this.gpuTracer.SetUniformVector ('uSpheres[' + i + '].material.diffuse', this.model.spheres[i].material.diffuse);
		this.gpuTracer.SetUniformFloat ('uSpheres[' + i + '].material.reflection', this.model.spheres[i].material.reflection);
	}
	for (i = 0; i < this.model.boxes.length; i++) {
		this.gpuTracer.SetUniformVector ('uBoxes[' + i + '].min', this.model.boxes[i].min);
		this.gpuTracer.SetUniformVector ('uBoxes[' + i + '].max', this.model.boxes[i].max);
		this.gpuTracer.SetUniformVector ('uBoxes[' + i + '].material.diffuse', this.model.boxes[i].material.diffuse);
		this.gpuTracer.SetUniformFloat ('uBoxes[' + i + '].material.reflection', this.model.boxes[i].material.reflection);
	}
	for (i = 0; i < this.model.cylinders.length; i++) {
		this.gpuTracer.SetUniformVector ('uCylinders[' + i + '].origin', this.model.cylinders[i].origin);
		this.gpuTracer.SetUniformFloat ('uCylinders[' + i + '].radius', this.model.cylinders[i].radius);
		this.gpuTracer.SetUniformFloat ('uCylinders[' + i + '].height', this.model.cylinders[i].height);
		this.gpuTracer.SetUniformVector ('uCylinders[' + i + '].material.diffuse', this.model.cylinders[i].material.diffuse);
		this.gpuTracer.SetUniformFloat ('uCylinders[' + i + '].material.reflection', this.model.cylinders[i].material.reflection);
	}
	
	return true;
};

ShapeTracer.prototype.StartRender = function (isPreviewMode)
{
	if (isPreviewMode) {
		this.gpuTracer.StartInPreviewMode ();
	} else {
		this.gpuTracer.StartInNormalMode ();
	}
};
