import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractAddress = searchParams.get('contractAddress');
    const chainId = searchParams.get('chainId');

    if (!contractAddress) {
      return NextResponse.json(
        { error: 'Missing contractAddress parameter' },
        { status: 400 }
      );
    }

    const apiKey = process.env.POLYGONSCAN_API_KEY || '';
    
    if (!apiKey) {
      console.error('[Server] POLYGONSCAN_API_KEY not set in environment');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const internalTxUrl = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=txlistinternal&address=${contractAddress}&startblock=0&endblock=99999999&sort=desc${apiKey ? `&apikey=${apiKey}` : ''}`;
    const regularTxUrl = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&sort=desc${apiKey ? `&apikey=${apiKey}` : ''}`;

    let internalResponse = await fetch(internalTxUrl);
    let internalData: any = null;
    
    if (internalResponse.ok) {
      internalData = await internalResponse.json();
    }

    let regularResponse = await fetch(regularTxUrl);
    let regularData: any = null;
    
    if (regularResponse.ok) {
      regularData = await regularResponse.json();
    }

    if (!internalData && !regularData) {
      return NextResponse.json(
        { error: 'Failed to fetch transaction data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      internalTransactions: {
        status: internalData?.status || '0',
        message: internalData?.message || 'Not available',
        result: internalData?.result || [],
      },
      regularTransactions: {
        status: regularData?.status || '0',
        message: regularData?.message || 'Not available',
        result: regularData?.result || [],
      },
    });

  } catch (error: any) {
    console.error('[Server] Error fetching transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

