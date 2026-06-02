type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, string | number | null>
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export async function reserveGenerationCredit(client: RpcClient, userId: string, generationId: string): Promise<boolean> {
  const { data, error } = await client.rpc("reserve_generation_credit", {
    p_user_id: userId,
    p_generation_id: generationId
  });

  if (error) throw new Error(error.message);
  return data === true;
}

export async function refundGenerationCredit(client: RpcClient, userId: string, generationId: string): Promise<void> {
  const { error } = await client.rpc("refund_generation_credit", {
    p_user_id: userId,
    p_generation_id: generationId
  });

  if (error) throw new Error(error.message);
}

export async function applyAdminCreditBonus(
  client: RpcClient,
  userId: string,
  amount: number,
  note: string | null = null
): Promise<boolean> {
  const { data, error } = await client.rpc("apply_admin_credit_bonus", {
    p_user_id: userId,
    p_amount: amount,
    p_note: note
  });

  if (error) throw new Error(error.message);
  return data === true;
}

export async function applyCaseReward(client: RpcClient, generationId: string, amount: number): Promise<boolean> {
  const { data, error } = await client.rpc("apply_case_reward", {
    p_generation_id: generationId,
    p_amount: amount
  });

  if (error) throw new Error(error.message);
  return data === true;
}
