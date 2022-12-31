cd "./JS"
if [ ! -d /node_modules ]; then 
    echo "Installing npm modules..."
    npm install
fi
cd "../"
echo "Starting bot..."
node "./JS/index.js"