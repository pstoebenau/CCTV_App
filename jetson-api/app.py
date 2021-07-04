from flask import Flask, jsonify, request
import json
from detectnet import detect

app = Flask(__name__)

@app.route("/")
def home():
  return "Wohooo!"

@app.route("/detect", methods=[ 'POST' ])
def detection():
  data = json.loads(request.data)
  return jsonify(detect(data['image']))

if __name__ == "__main__":
  app.run()