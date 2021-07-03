from flask import Flask
from detectnet import detect

app = Flask(__name__)

@app.route("/")
def home():
  return "Wohooo!"

@app.route("/detect/<img>")
def detection(img):
  return detect(img)

if __name__ == "__main__":
  app.run(host='0.0.0.0')