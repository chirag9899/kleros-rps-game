import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';


export async function POST(request: NextRequest) {
  try {
    const { contractAddress, constructorArgs, chainId } = await request.json();

    if (!contractAddress || !constructorArgs) {
      return NextResponse.json(
        { error: 'Missing contractAddress or constructorArgs' },
        { status: 400 }
      );
    }

    const apiKey = process.env.POLYGONSCAN_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { 
          guid: null, 
          status: 'skipped_no_api_key',
          message: 'No API key configured on server'
        },
        { status: 200 }
      );
    }

    const contractPath = join(process.cwd(), '..', 'rps-contract', 'src', 'rps.sol');
    const RPS_SOURCE_CODE = readFileSync(contractPath, 'utf-8');

    const params = new URLSearchParams({
      module: 'contract',
      action: 'verifysourcecode',
      contractaddress: contractAddress,
      sourceCode: RPS_SOURCE_CODE,
      codeformat: 'solidity-single-file',
      contractname: 'RPS',
      compilerversion: 'v0.4.26+commit.4563c3fc',
      optimizationUsed: '1',
      runs: '200',
      constructorArguements: constructorArgs.startsWith('0x') 
        ? constructorArgs.slice(2) 
        : constructorArgs,
      evmversion: 'byzantium',
      licenseType: '1',
      apikey: apiKey,
    });

    const response = await fetch(
      `https://api.etherscan.io/v2/api?chainid=${chainId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    const data = await response.json();

    if (data.status === '1') {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const status = await checkVerificationStatus(data.result, apiKey, chainId);
      
      return NextResponse.json({
        guid: data.result,
        status,
        message: 'Verification submitted successfully',
      });
    } else {
      if (data.result && data.result.includes('Unable to locate ContractCode')) {
        return NextResponse.json({
          guid: null,
          status: 'retry_needed',
          message: 'Contract not yet indexed. Please try again in a few minutes.',
        });
      }
      
      return NextResponse.json({
        guid: null,
        status: 'failed',
        message: data.result,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { 
        guid: null, 
        status: 'error',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

async function checkVerificationStatus(guid: string, apiKey: string, chainId?: number): Promise<string> {
  try {
    const params = new URLSearchParams({
      module: 'contract',
      action: 'checkverifystatus',
      guid,
      apikey: apiKey,
    });

    const response = await fetch(
      `https://api.etherscan.io/v2/api?chainid=${chainId}&${params.toString()}`
    );

    const data = await response.json();
    return data.status === '1' ? data.result : 'Pending';
  } catch (error) {
    return 'Error checking status';
  }
}

