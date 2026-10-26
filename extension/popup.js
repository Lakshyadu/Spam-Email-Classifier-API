document.addEventListener('DOMContentLoaded', () => {
    const checkButton = document.getElementById('checkButton');
    const emailInput = document.getElementById('emailInput');
    const resultDiv = document.getElementById('resultDiv');

    checkButton.addEventListener('click', async () => {
        const text = emailInput.value.trim();
        
        if (!text) {
            resultDiv.innerText = "Please enter some email text!";
            return;
        }

        resultDiv.innerText = "Checking...";

        try {
            const response = await fetch('http://127.0.0.1:8000/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: text })
            });

            const data = await response.json();

            if (response.ok) {
                resultDiv.innerHTML = `<strong>Result:</strong> ${data.prediction} <br> <strong>Confidence:</strong> ${data.confidence || 'N/A'}`;
            } else {
                resultDiv.innerText = `Error: ${data.detail || "Something went wrong"}`;
            }
        } catch (error) {
            resultDiv.innerText = "Failed to connect to backend server. Make sure FastAPI is running!";
            console.error(error);
        }
    });
});