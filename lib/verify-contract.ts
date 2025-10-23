export async function verifyContract(
  contractAddress: string,
  constructorArgs: string
): Promise<{
  message: any; guid: string | null; status: string 
}> {
  try {
    const response = await fetch('/api/verify-contract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contractAddress,
        constructorArgs,
      }),
    });

    const data = await response.json();

    return {
      guid: data.guid,
      status: data.status,
      message: data.message,
    };
  } catch (error: any) {
    console.error('Error verifying contract:', error.message);
    return {
      guid: null,
      status: 'error: ',
      message: error.message,
    };
  }
}

