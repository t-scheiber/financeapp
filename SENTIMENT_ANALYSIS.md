# Sentiment Analysis with Hugging Face

This guide explains how the AI-powered sentiment analysis feature works in FinanceApp.

## 🤖 Overview

FinanceApp uses **Hugging Face's Inference API** to automatically analyze the sentiment of news articles. Every news article is classified as:
- **😊 Positive** - Optimistic or favorable news
- **😟 Negative** - Concerning or unfavorable news
- **😐 Neutral** - Balanced or factual reporting

## 🆓 Why Hugging Face?

### Free Tier Benefits:
- ✅ **Unlimited requests** on the Inference API
- ✅ **No credit card required**
- ✅ **State-of-the-art AI model**
- ✅ **Fast and reliable**
- ✅ **Simple REST API**

### Model Used:
**distilbert-base-uncased-finetuned-sst-2-english**
- Fine-tuned BERT model for sentiment classification
- Trained on Stanford Sentiment Treebank (SST-2)
- High accuracy (91%+) on English text
- Optimized for speed with DistilBERT architecture

## 🔧 Setup

### 1. Create Hugging Face Account
1. Go to [huggingface.co](https://huggingface.co/)
2. Sign up for a free account
3. Verify your email

### 2. Get Your API Token
1. Log in to Hugging Face
2. Click your profile picture → **Settings**
3. Go to **Access Tokens** section
4. Click **New token**
5. Give it a name (e.g., "FinanceApp")
6. Select **Read** access (write not needed)
7. Click **Generate token**
8. Copy your token (starts with `hf_...`)

### 3. Add to Environment Variables

Add to your `.env` file:
```env
HUGGINGFACE_API_KEY=hf_YourActualTokenHere
```

For production (Hostinger/Vercel):
- Add the same variable in your hosting dashboard
- Restart your application

## 📊 How It Works

### 1. News Fetching Flow
```
News API → Fetch Articles → Analyze Sentiment → Store in DB
```

### 2. Sentiment Analysis Process
1. **Input**: News article title + summary
2. **Processing**: Send to Hugging Face API
3. **Output**: Sentiment label (positive/negative/neutral) + confidence score
4. **Storage**: Sentiment stored in database with article

### 3. Display
- Sentiment badges shown on company pages
- Color-coded (green/red/gray)
- Emoji indicators for quick recognition

## 🔬 Technical Details

### API Endpoint
```
https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english
```

### Request Format
```json
{
  "inputs": "Apple announces record-breaking quarterly earnings...",
  "options": {
    "wait_for_model": true
  }
}
```

### Response Format
```json
[
  [
    { "label": "POSITIVE", "score": 0.9998 },
    { "label": "NEGATIVE", "score": 0.0002 }
  ]
]
```

### Rate Limiting
- **Free tier**: Reasonable limits for personal projects
- **Built-in delays**: 100ms between sentiment API calls
- **Graceful fallback**: Returns "neutral" on errors
- **No hard limits** specified by Hugging Face

## 💡 Implementation Details

### Service Class
Location: `lib/services/sentiment-api.ts`

Key methods:
- `analyzeSentiment(text)` - Analyze any text
- `analyzeNews(title, summary)` - Specialized for news
- `analyzeBatch(texts[])` - Batch processing with delays

### API Integration
Location: `app/api/news/route.ts`

```typescript
const sentimentResult = await sentimentAPI.analyzeNews(
  article.title,
  article.summary,
);

await prisma.news.create({
  // ... other fields
  sentiment: sentimentResult.sentiment,
});
```

### Cron Job
Location: `app/api/cron/refresh-data/route.ts`

Automatically analyzes sentiment when fetching new articles every 3 hours.

## 🎨 UI Components

### Sentiment Badge
```typescript
{article.sentiment && (
  <span className={`badge ${getSentimentStyle(article.sentiment)}`}>
    {getSentimentIcon(article.sentiment)} {article.sentiment}
  </span>
)}
```

### Color Scheme
- **Positive**: Green background, green text (`bg-green-100 text-green-700`)
- **Negative**: Red background, red text (`bg-red-100 text-red-700`)
- **Neutral**: Gray background, gray text (`bg-gray-100 text-gray-700`)

## 📈 Performance

### Analysis Speed
- ~200-500ms per article
- Processes 10 articles in ~5 seconds with delays
- Non-blocking: doesn't affect page load

### Database Storage
- Sentiment stored as VARCHAR in `news` table
- No additional tables needed
- Values: "positive", "negative", "neutral", NULL

### Caching
- Sentiment stored permanently in database
- No re-analysis for existing articles
- Only new articles analyzed

## 🔍 Examples

### Positive Sentiment Example
**Title**: "Apple Reports Record Q4 Earnings, Beats Expectations"  
**Result**: 😊 positive (confidence: 0.9998)

### Negative Sentiment Example
**Title**: "Tesla Recalls 2 Million Vehicles Over Safety Concerns"  
**Result**: 😟 negative (confidence: 0.9876)

### Neutral Sentiment Example
**Title**: "Microsoft Announces Quarterly Board Meeting Date"  
**Result**: 😐 neutral (confidence: 0.7234)

## 🐛 Troubleshooting

### Issue: No sentiment showing
**Solution**: Check if `HUGGINGFACE_API_KEY` is set correctly

### Issue: All articles showing "neutral"
**Solutions**:
- Verify API key is valid
- Check Hugging Face service status
- Review application logs for errors

### Issue: Slow sentiment analysis
**Solutions**:
- Normal: First request may load model (~20s)
- Subsequent requests are fast (~200-500ms)
- Consider increasing delay between calls

### Issue: Rate limit errors
**Solutions**:
- Built-in 100ms delays should prevent this
- Check logs for specific error messages
- Contact Hugging Face support if persistent

## 📊 Monitoring

### Check Sentiment Coverage
```sql
SELECT 
  COUNT(*) as total_articles,
  SUM(CASE WHEN sentiment IS NOT NULL THEN 1 ELSE 0 END) as analyzed,
  SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
  SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative,
  SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral
FROM news;
```

### Check Recent Sentiment
```sql
SELECT title, sentiment, publishedAt 
FROM news 
WHERE sentiment IS NOT NULL 
ORDER BY publishedAt DESC 
LIMIT 10;
```

## 🔮 Future Enhancements

Possible improvements:
- [ ] Sentiment score/confidence display
- [ ] Sentiment trends over time
- [ ] Filter news by sentiment
- [ ] Sentiment-based alerts

## 🔗 Resources

- [Hugging Face Inference API Docs](https://huggingface.co/docs/api-inference/index)
- [DistilBERT Model Card](https://huggingface.co/distilbert-base-uncased-finetuned-sst-2-english)
- [Hugging Face Pricing](https://huggingface.co/pricing) (Free tier info)
- [SST-2 Dataset](https://paperswithcode.com/dataset/sst) (Training data)

## ✨ Benefits for Your App

1. **Better News Filtering** - Quickly identify concerning news
2. **Market Sentiment** - Gauge overall sentiment for each company
3. **User Experience** - Visual indicators help users scan news faster
4. **Professional Feel** - AI-powered features add credibility
5. **Free Forever** - No ongoing costs with Hugging Face free tier

---

**Note**: Sentiment analysis is automatic and runs during data refresh cycles. No manual intervention needed once configured!

