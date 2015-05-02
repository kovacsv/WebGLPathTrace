var UserInterface = {};

UserInterface.AddTitle = function (parent, title)
{
	var div = document.createElement ('div');
	div.innerHTML = title;
	div.className = 'controltitle';
	parent.appendChild (div);
	return div;
};

UserInterface.AddMainElem = function (parent)
{
	var div = document.createElement ('div');
	div.className = 'controldiv';
	parent.appendChild (div);
	return div;
};

UserInterface.AddSelectControl = function (parent, title, elements, defaultIndex, elemClicked)
{
	function SetActiveElem (parent, index)
	{
		var i, div;
		for (i = 1; i < parent.childNodes.length; i++) {
			div = parent.childNodes[i];
			if (i == index + 1) {
				div.className = 'selectitem selected';
			} else {
				div.className = 'selectitem';
			}
		}			
	}

	function AddElem (parent, index)
	{
		var div = document.createElement ('div');
		div.innerHTML = elements[index];
		div.addEventListener ('click', function () {
			SetActiveElem (parent, index);
			elemClicked (index);
		});
		parent.appendChild (div);
		return div;
	}
	
	var div = document.createElement ('div');
	div.className = 'controlsubdiv';

	var controlTitle = document.createElement ('div');
	controlTitle.innerHTML = title;
	controlTitle.className = 'selecttitle';
	div.appendChild (controlTitle);

	var i;
	for (i = 0; i < elements.length; i++) {
		AddElem (div, i);
	}
	parent.appendChild (div);

	SetActiveElem (div, defaultIndex);
};

UserInterface.AddSliderControl = function (parent, title, defaultRatio, elemClicked)
{
	function SetRatio (slider, sliderContent, ratio)
	{
		var length = (slider.offsetWidth - 2) * ratio;
		sliderContent.style.width = length + 'px';
	}
	
	function MouseEvent (slider, sliderContent, event)
	{
		var mouseClick = event.clientX - (sliderContent.offsetLeft - 1);
		if (mouseClick < 0 || mouseClick > slider.offsetWidth) {
			return;
		}
		var ratio = mouseClick / (slider.offsetWidth - 1);
		SetRatio (slider, sliderContent, ratio);
		elemClicked (ratio);	
	}
	
	var div = document.createElement ('div');
	div.className = 'controlsubdiv';
	
	var sliderTitle = document.createElement ('div');
	sliderTitle.innerHTML = title;
	sliderTitle.className = 'slidertitle';

	var slider = document.createElement ('div');
	slider.className = 'slider';

	var sliderContent = document.createElement ('div');
	sliderContent.className = 'slidercontent';
	slider.appendChild (sliderContent);

	var mouseDown = false;
	div.addEventListener ('mousedown', function (event) {
		mouseDown = true;
		MouseEvent (slider, sliderContent, event);
	});
	window.addEventListener ('mouseup', function (event) {
		mouseDown = false;
	});
	window.addEventListener ('mousemove', function (event) {
		if (mouseDown) {
			MouseEvent (slider, sliderContent, event);
		}
	});
	
	div.appendChild (sliderTitle);
	div.appendChild (slider);
	parent.appendChild (div);
	
	SetRatio (slider, sliderContent, defaultRatio);
};

UserInterface.ToSlider = function (value, min, max)
{
	return (value - min) / (max - min);
};

UserInterface.FromSlider = function (value, min, max)
{
	return min + value * (max - min);
};
