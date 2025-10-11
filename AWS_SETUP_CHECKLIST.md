# AWS Setup Checklist

Copy this checklist and check off items as you complete them:

## Pre-requisites
- [ ] Have an AWS account (create at https://aws.amazon.com if needed)
- [ ] Access to AWS Console

## S3 Bucket Setup
- [ ] Created S3 bucket
- [ ] Noted bucket name: ___________________________
- [ ] Noted region: ___________________________
- [ ] Disabled "Block all public access"
- [ ] Added bucket policy for public read access

## IAM User Setup
- [ ] Created IAM user (name: ___________________________)
- [ ] Attached S3 permissions (AmazonS3FullAccess or custom policy)
- [ ] Created access keys
- [ ] Saved Access Key ID: ___________________________
- [ ] Saved Secret Access Key: ___________________________
- [ ] ⚠️ Stored credentials securely (password manager recommended)

## Project Configuration
- [ ] Opened `.env.local` file
- [ ] Updated `AWS_ACCESS_KEY_ID`
- [ ] Updated `AWS_SECRET_ACCESS_KEY`
- [ ] Updated `AWS_S3_BUCKET_NAME`
- [ ] Updated `AWS_REGION`
- [ ] Saved `.env.local`

## Testing
- [ ] Restarted dev server (`pnpm dev`)
- [ ] Opened http://localhost:3000
- [ ] Uploaded a test file
- [ ] Verified file appears in file list
- [ ] Checked S3 bucket in AWS Console for uploaded file
- [ ] Tested file download/view
- [ ] Tested file delete

## Security Check
- [ ] `.env.local` is in `.gitignore`
- [ ] Access keys not committed to git
- [ ] Bucket policy allows only necessary public access
- [ ] IAM user has minimal required permissions

## Done! 🎉

Your file storage app is now connected to AWS S3!

---

## Quick Reference

**AWS S3 Console**: https://console.aws.amazon.com/s3/
**AWS IAM Console**: https://console.aws.amazon.com/iam/
**Your bucket URL format**: `https://YOUR_BUCKET_NAME.s3.YOUR_REGION.amazonaws.com/`

**Need help?** Check `AWS_SETUP_GUIDE.md` for detailed instructions.
