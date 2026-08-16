from app.models.session import SessionRecord


def render_session_pdf(session: SessionRecord) -> bytes:
    """Render a PDF when reportlab is installed; otherwise fail at use, not import."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen.canvas import Canvas
    except ImportError as exc:
        raise RuntimeError("PDF export requires the optional reportlab package") from exc
    from io import BytesIO
    output = BytesIO()
    canvas = Canvas(output, pagesize=letter)
    canvas.drawString(48, 750, session.title)
    canvas.drawString(48, 725, f"Overall score: {session.evaluation.overall_score if session.evaluation else 'N/A'}")
    canvas.save()
    return output.getvalue()
