describe('Simple Test Suite', () => {
  test('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should work with async operations', async () => {
    const promise = Promise.resolve('success');
    await expect(promise).resolves.toBe('success');
  });

  test('should work with mocks', () => {
    const mockFn = jest.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});