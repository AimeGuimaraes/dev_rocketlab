import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RatingDisplay } from './RatingDisplay';

describe('RatingDisplay', () => {
  it('descreve a nota no rótulo acessível', () => {
    render(<RatingDisplay value={8.43} />);
    expect(screen.getByRole('img', { name: 'Nota 8,4 de 10' })).toBeInTheDocument();
    expect(screen.getByText('8,4')).toBeInTheDocument();
  });

  it('inclui a quantidade de avaliações no rótulo, no singular e no plural', () => {
    const { rerender } = render(<RatingDisplay value={7} count={1} />);
    expect(screen.getByRole('img', { name: 'Nota 7,0 de 10, 1 avaliação' })).toBeInTheDocument();

    rerender(<RatingDisplay value={7} count={1520} />);
    expect(
      screen.getByRole('img', { name: 'Nota 7,0 de 10, 1.520 avaliações' }),
    ).toBeInTheDocument();
  });

  it('só mostra a contagem no texto com showCount', () => {
    const { rerender } = render(<RatingDisplay value={9} count={3} />);
    expect(screen.queryByText('(3 avaliações)')).not.toBeInTheDocument();

    rerender(<RatingDisplay value={9} count={3} showCount />);
    expect(screen.getByText('(3 avaliações)')).toBeInTheDocument();
  });

  it('mostra "Sem avaliações" sem nota ou com contagem zero', () => {
    const { rerender } = render(<RatingDisplay value={null} />);
    expect(screen.getByText('Sem avaliações')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();

    rerender(<RatingDisplay value={6} count={0} />);
    expect(screen.getByText('Sem avaliações')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('mostra a nota 0 (não confunde com ausência de nota)', () => {
    render(<RatingDisplay value={0} count={2} />);
    expect(screen.getByRole('img', { name: 'Nota 0,0 de 10, 2 avaliações' })).toBeInTheDocument();
  });
});
