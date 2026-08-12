document.addEventListener('DOMContentLoaded', () => {
    const codeBlock = document.getElementById('prisma-code');
    
    // Fetch the raw schema.prisma file and display it
    fetch('schema.prisma')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(text => {
            // Very simple syntax highlighting for Prisma syntax
            const highlightedText = text
                .replace(/model (\w+)/g, '<span style="color: #ff79c6;">model</span> <span style="color: #8be9fd;">$1</span>')
                .replace(/enum (\w+)/g, '<span style="color: #ff79c6;">enum</span> <span style="color: #8be9fd;">$1</span>')
                .replace(/(\w+)\s+(String|Int|DateTime|Decimal|Boolean|Json)/g, '<span style="color: #f8f8f2;">$1</span> <span style="color: #bd93f9;">$2</span>')
                .replace(/(@[a-zA-Z0-9_()]+)/g, '<span style="color: #50fa7b;">$1</span>')
                .replace(/(\/\/.*)/g, '<span style="color: #6272a4;">$1</span>');
            
            codeBlock.innerHTML = highlightedText;
        })
        .catch(error => {
            codeBlock.textContent = "Error loading schema: " + error.message;
        });
});
