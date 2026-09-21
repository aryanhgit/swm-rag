from flask import Flask, jsonify, request
from flask_cors import CORS

from rag_query import answer

app = Flask(__name__)
CORS(app)


@app.route("/query", methods=["POST"])
def query():
    data = request.get_json()
    question = data.get("question", "").strip()
    if not question:
        return jsonify({"error": "question is required"}), 400

    result = answer(question)
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
