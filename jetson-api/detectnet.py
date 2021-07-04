import jetson.inference
import jetson.utils
import json
import os

net = jetson.inference.detectNet("ssd-mobilenet-v2", threshold=0.5)

def detect(img):
	img = jetson.utils.loadImage(img)

	detections = net.Detect(img)

	retval = []
	for detection in detections:
		retval.append({
			'class': net.GetClassDesc(detection.ClassID),
			'confidence': detection.Confidence,
			'left': detection.Left,
			'top': detection.Top,
			'right': detection.Right,
			'bottom': detection.Bottom,
			'width': detection.Width,
			'height': detection.Height,
			'area': detection.Area,
			'center': detection.Center,
		})

	return retval
